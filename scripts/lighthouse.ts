/**
 * Lighthouse (mobile profile, simulated throttling) on the home page and a
 * content page, against `astro preview`. Fails below the budgets.
 *
 *   pnpm build && pnpm perf
 *
 * Needs a Chrome binary: set CHROME_PATH (or PW_CHROMIUM_PATH). CI installs
 * Chromium through Playwright.
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const port = 4399;
const base = `http://localhost:${port}`;
const pages = ["/", "/blog/zero-javascript-by-default"];
const chromePath =
  process.env["CHROME_PATH"] ??
  process.env["PW_CHROMIUM_PATH"] ??
  chromium.executablePath();

const budgets = {
  performance: 95,
  accessibility: 100,
  "best-practices": 100,
  seo: 100,
} as const;
const vitals = { lcpMs: 2000, cls: 0.05 };

const server = spawn(
  "pnpm",
  ["exec", "astro", "preview", "--port", String(port)],
  {
    stdio: "ignore",
    env: { ...process.env, PUBLIC_SITE_URL: base },
  },
);

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(base)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("preview server did not start. Run `pnpm build` first.");
}

const problems: string[] = [];
const report: Record<string, unknown> = {};

try {
  await waitForServer();
  mkdirSync("perf-report", { recursive: true });
  for (const path of pages) {
    const out = `perf-report/lighthouse-${path === "/" ? "home" : "post"}.json`;
    const run = spawnSync(
      "pnpm",
      [
        "exec",
        "lighthouse",
        `${base}${path}`,
        "--output=json",
        `--output-path=${out}`,
        "--quiet",
        "--form-factor=mobile",
        "--throttling-method=simulate",

        "--chrome-flags=--headless=new --no-sandbox --disable-gpu",
        "--only-categories=performance,accessibility,best-practices,seo",
      ],
      { encoding: "utf8", env: { ...process.env, CHROME_PATH: chromePath } },
    );
    if (run.status !== 0)
      throw new Error(`lighthouse failed for ${path}:\n${run.stderr}`);
    const lhr = JSON.parse(readFileSync(out, "utf8")) as {
      categories: Record<string, { score: number }>;
      audits: Record<string, { numericValue: number }>;
    };
    const scores = Object.fromEntries(
      Object.entries(lhr.categories).map(([k, v]) => [
        k,
        Math.round(v.score * 100),
      ]),
    );
    const lcp = lhr.audits["largest-contentful-paint"]?.numericValue ?? 0;
    const cls = lhr.audits["cumulative-layout-shift"]?.numericValue ?? 0;
    const tbt = lhr.audits["total-blocking-time"]?.numericValue ?? 0;
    report[path] = { scores, lcp: Math.round(lcp), cls, tbt: Math.round(tbt) };
    console.log(
      `${path}  perf ${scores["performance"]}  a11y ${scores["accessibility"]}  bp ${scores["best-practices"]}  seo ${scores["seo"]}  LCP ${Math.round(lcp)} ms  CLS ${cls.toFixed(3)}  TBT ${Math.round(tbt)} ms`,
    );
    for (const [cat, min] of Object.entries(budgets)) {
      if ((scores[cat] ?? 0) < min)
        problems.push(`${path}: ${cat} ${scores[cat]} < ${min}`);
    }
    if (lcp > vitals.lcpMs)
      problems.push(`${path}: LCP ${Math.round(lcp)} ms > ${vitals.lcpMs} ms`);
    if (cls > vitals.cls)
      problems.push(`${path}: CLS ${cls.toFixed(3)} > ${vitals.cls}`);
  }
  writeFileSync("perf-report/lighthouse.json", JSON.stringify(report, null, 2));
} finally {
  server.kill();
}

if (problems.length) {
  console.error(`\n${problems.length} Lighthouse budget problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log("\nLighthouse budgets hold.");
