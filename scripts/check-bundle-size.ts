/**
 * Parses dist/ and reports JS and CSS per route, then enforces the budgets.
 *
 *   pnpm build && pnpm perf:size
 *
 * Budgets (docs/architecture.md):
 *   - a page with no data-motion and no island ships 0 bytes of JS
 *     (the one inline `html.js` script and JSON-LD data blocks are excluded)
 *   - an animated page ships under 50 KB gzipped of INITIAL JS; lazily
 *     imported chunks (GSAP) are reported separately
 *   - a page with data-motion must include the motion registry, and a page
 *     without it must not
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const dist = resolve(process.cwd(), "dist");
if (!existsSync(dist)) {
  console.error("dist/ not found. Run `pnpm build` first.");
  process.exit(1);
}

const INITIAL_BUDGET = 50 * 1024;
const gz = (buf: Buffer | string) => gzipSync(buf).length;
const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const p = join(dir, entry);
    return statSync(p).isDirectory()
      ? htmlFiles(p)
      : p.endsWith(".html")
        ? [p]
        : [];
  });
}

const chunkCache = new Map<
  string,
  { size: number; statics: string[]; dynamics: string[] }
>();

function chunk(file: string) {
  let hit = chunkCache.get(file);
  if (hit) return hit;
  const source = readFileSync(file);
  const text = source.toString("utf8");
  const resolveSpec = (spec: string) =>
    spec.startsWith("/") ? join(dist, spec) : join(dirname(file), spec);
  const statics = [
    ...text.matchAll(
      /(?:^|[;}\s])(?:import|export)\s*(?:[^"'()]*?from\s*)?["'](\.[^"']+\.js|\/_astro\/[^"']+\.js)["']/g,
    ),
  ].map((m) => resolveSpec(m[1] ?? ""));
  const dynamics = [
    ...text.matchAll(
      /import\(\s*["'](\.[^"']+\.js|\/_astro\/[^"']+\.js)["']\s*\)/g,
    ),
  ].map((m) => resolveSpec(m[1] ?? ""));
  hit = { size: gz(source), statics, dynamics };
  chunkCache.set(file, hit);
  return hit;
}

function closure(
  entries: string[],
  pick: "statics" | "dynamics-too",
  exclude = new Set<string>(),
) {
  const seen = new Set<string>();
  const queue = [...entries];
  while (queue.length) {
    const file = queue.pop() as string;
    if (seen.has(file) || exclude.has(file) || !existsSync(file)) continue;
    seen.add(file);
    const c = chunk(file);
    queue.push(...c.statics);
    if (pick === "dynamics-too") queue.push(...c.dynamics);
  }
  return seen;
}

interface Row {
  route: string;
  jsInitial: number;
  jsLazy: number;
  css: number;
  inlineJs: number;
  motion: boolean;
}

const rows: Row[] = [];
const problems: string[] = [];

for (const file of htmlFiles(dist)) {
  const html = readFileSync(file, "utf8");
  const route =
    "/" +
    relative(dist, file)
      .replace(/index\.html$/, "")
      .replace(/\.html$/, "")
      .replace(/\/$/, "");

  // Scripts: external module scripts, plus inline scripts other than html.js and JSON-LD.
  const external = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"[^>]*>/g)].map(
    (m) => join(dist, m[1] ?? ""),
  );
  let inlineJs = 0;
  const inlineEntries: string[] = [];
  for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    const attrs = m[1] ?? "";
    const body = m[2] ?? "";
    if (
      /\ssrc=/.test(attrs) ||
      /application\/ld\+json/.test(attrs) ||
      body.trim() === ""
    )
      continue;
    if (
      body.replace(/[\s;]/g, "") ===
      'document.documentElement.classList.add("js")'.replace(/[\s;]/g, "")
    )
      continue; // html.js
    continue; // html.js
    inlineJs += gz(body);
    inlineEntries.push(body);
  }

  const initial = closure(external, "statics");
  const all = closure(external, "dynamics-too");
  const jsInitial =
    [...initial].reduce((n, f) => n + chunk(f).size, 0) + inlineJs;
  const jsLazy = [...all]
    .filter((f) => !initial.has(f))
    .reduce((n, f) => n + chunk(f).size, 0);

  const cssFiles = [
    ...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g),
  ].map((m) => join(dist, m[1] ?? ""));
  const inlineCss = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(
    (m) => m[1] ?? "",
  );
  const css =
    cssFiles.reduce(
      (n, f) => n + (existsSync(f) ? gz(readFileSync(f)) : 0),
      0,
    ) + inlineCss.reduce((n, s) => n + gz(s), 0);

  const hasMotionEls = /data-motion="/.test(html);
  const hasRegistry = external.some((f) => /Motion\.astro/.test(f));
  const motion = hasMotionEls;

  if (hasMotionEls && !hasRegistry)
    problems.push(
      `${route}: has data-motion elements but no motion registry script. Content hidden by html.js CSS would never appear. Add <Motion />.`,
    );
  if (!hasMotionEls && hasRegistry)
    problems.push(
      `${route}: loads the motion registry but has no data-motion elements.`,
    );
  if (hasMotionEls && jsInitial > INITIAL_BUDGET)
    problems.push(
      `${route}: initial JS ${kb(jsInitial)} exceeds the ${kb(INITIAL_BUDGET)} budget.`,
    );
  if (!hasMotionEls && external.length === 0 && jsInitial > 0)
    problems.push(
      `${route}: ships ${kb(jsInitial)} of inline JS on a page with no motion and no island (budget: 0).`,
    );
  if (!hasMotionEls && /gsap|ScrollTrigger/i.test([...all].join(" ")))
    problems.push(
      `${route}: GSAP is reachable from a page with no data-motion.`,
    );
  void inlineEntries;

  rows.push({ route: route || "/", jsInitial, jsLazy, css, inlineJs, motion });
}

rows.sort((a, b) => a.route.localeCompare(b.route));
const width = Math.max(...rows.map((r) => r.route.length), 5);
console.log(
  `${"route".padEnd(width)}  ${"JS initial".padStart(11)}  ${"JS lazy".padStart(9)}  ${"CSS".padStart(8)}  motion`,
);
for (const r of rows) {
  console.log(
    `${r.route.padEnd(width)}  ${kb(r.jsInitial).padStart(11)}  ${kb(r.jsLazy).padStart(9)}  ${kb(r.css).padStart(8)}  ${r.motion ? "yes" : "-"}`,
  );
}
console.log("(gzipped; html.js inline script and JSON-LD excluded)");

mkdirSync(resolve(process.cwd(), "perf-report"), { recursive: true });
writeFileSync(
  resolve(process.cwd(), "perf-report/bundle.json"),
  JSON.stringify(rows, null, 2),
);

if (problems.length) {
  console.error(`\n${problems.length} budget problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log("\nBundle budgets hold.");
