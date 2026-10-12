/**
 * Lighthouse (mobile profile, simulated throttling) on the home page and a
 * content page, against `astro preview`. Each page is audited RUNS times and
 * the median of every score and metric is held to the budgets: a single
 * simulated run moves LCP in ~75 ms steps with request queueing, so one
 * unlucky run would fail a page whose typical result is well inside.
 *
 *   pnpm build && pnpm perf
 *
 * Needs a Chrome binary: set CHROME_PATH (or PW_CHROMIUM_PATH). CI installs
 * Chromium through Playwright.
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

// LH_PORT overrides the port, e.g. when another checkout's preview holds it.
const port = Number(process.env["LH_PORT"]) || 4399;
const base = `http://localhost:${port}`;
const pages = ["/", "/blog/zero-javascript-by-default"];
const chromePath =
  process.env["CHROME_PATH"] ??
  process.env["PW_CHROMIUM_PATH"] ??
  chromium.executablePath();

const RUNS = 3;
const budgets = {
  performance: 95,
  accessibility: 100,
  "best-practices": 100,
  seo: 100,
} as const;
const vitals = { lcpMs: 2000, cls: 0.05 };

// A server already on the port would be audited instead of this build.
try {
  await fetch(base);
  console.error(
    `Port ${port} is already serving something; it would be audited instead of this build. Stop it or set LH_PORT.`,
  );
  process.exit(1);
} catch {
  /* free, as it should be */
}

const server = spawn(
  "pnpm",
  ["exec", "astro", "preview", "--port", String(port)],
  {
    stdio: "ignore",
    // Own process group, so the cleanup below also stops astro, not just pnpm.
    detached: true,
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

interface Run {
  scores: Record<string, number>;
  lcp: number;
  cls: number;
  tbt: number;
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

const format = (r: Run) =>
  `perf ${r.scores["performance"]}  a11y ${r.scores["accessibility"]}  bp ${r.scores["best-practices"]}  seo ${r.scores["seo"]}  LCP ${r.lcp} ms  CLS ${r.cls.toFixed(3)}  TBT ${r.tbt} ms`;

function audit(path: string, out: string): Run {
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
    categories: Record<string, { score: number | null }>;
    audits: Record<string, { numericValue?: number }>;
  };
  return {
    scores: Object.fromEntries(
      Object.entries(lhr.categories).map(([k, v]) => [
        k,
        Math.round((v.score ?? 0) * 100),
      ]),
    ),
    lcp: Math.round(lhr.audits["largest-contentful-paint"]?.numericValue ?? 0),
    cls: lhr.audits["cumulative-layout-shift"]?.numericValue ?? 0,
    tbt: Math.round(lhr.audits["total-blocking-time"]?.numericValue ?? 0),
  };
}

const problems: string[] = [];
const report: Record<string, unknown> = {};

try {
  await waitForServer();
  mkdirSync("perf-report", { recursive: true });
  for (const path of pages) {
    const name = path === "/" ? "home" : "post";
    const runs: Run[] = [];
    for (let i = 1; i <= RUNS; i++) {
      const r = audit(path, `perf-report/lighthouse-${name}-${i}.json`);
      runs.push(r);
      console.log(`${path}  run ${i}/${RUNS}  ${format(r)}`);
    }
    const scores = Object.fromEntries(
      Object.keys(runs[0]?.scores ?? {}).map((k) => [
        k,
        median(runs.map((r) => r.scores[k] ?? 0)),
      ]),
    );
    const lcp = median(runs.map((r) => r.lcp));
    const cls = median(runs.map((r) => r.cls));
    const tbt = median(runs.map((r) => r.tbt));
    const result: Run = { scores, lcp, cls, tbt };
    report[path] = { median: result, runs };
    console.log(`${path}  median     ${format(result)}`);
    for (const [cat, min] of Object.entries(budgets)) {
      if ((scores[cat] ?? 0) < min)
        problems.push(`${path}: median ${cat} ${scores[cat]} < ${min}`);
    }
    if (lcp > vitals.lcpMs)
      problems.push(`${path}: median LCP ${lcp} ms > ${vitals.lcpMs} ms`);
    if (cls > vitals.cls)
      problems.push(`${path}: median CLS ${cls.toFixed(3)} > ${vitals.cls}`);
  }
  writeFileSync("perf-report/lighthouse.json", JSON.stringify(report, null, 2));
} finally {
  if (server.pid) process.kill(-server.pid);
}

if (problems.length) {
  console.error(`\n${problems.length} Lighthouse budget problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log("\nLighthouse budgets hold.");
