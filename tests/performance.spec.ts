import { expect, test } from "@playwright/test";

/**
 * Lab checks on the local build (unthrottled, so thresholds are the spec's
 * targets with no headroom added). `pnpm perf` runs Lighthouse for the
 * throttled mobile profile.
 */
async function vitals(page: import("@playwright/test").Page, path: string) {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, number>;
    w["__cls"] = 0;
    w["__lcp"] = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as Array<{
        hadRecentInput: boolean;
        value: number;
      }>) {
        if (!entry.hadRecentInput) w["__cls"] = (w["__cls"] ?? 0) + entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => {
      const last = list.getEntries().at(-1);
      if (last) w["__lcp"] = last.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  await page.goto(path, { waitUntil: "networkidle" });
  await page.mouse.wheel(0, 3000);
  await page.waitForTimeout(1200);
  return page.evaluate(() => {
    const w = window as unknown as Record<string, number>;
    return { cls: w["__cls"] ?? 0, lcp: w["__lcp"] ?? 0 };
  });
}

for (const path of ["/", "/about", "/blog/zero-javascript-by-default"]) {
  test(`${path}: LCP under 2.0 s and CLS under 0.05`, async ({ page }) => {
    const { cls, lcp } = await vitals(page, path);
    expect(lcp, "LCP (ms)").toBeLessThan(2000);
    expect(cls, "CLS").toBeLessThan(0.05);
  });
}

test("INP: interactions respond in under 150 ms", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, number>;
    w["__inp"] = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries())
        w["__inp"] = Math.max(w["__inp"] ?? 0, e.duration);
    }).observe({
      type: "event",
      durationThreshold: 16,
      buffered: true,
    } as PerformanceObserverInit);
  });
  await page.goto("/styleguide", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Options" }).click();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Open dialog" }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Specs" }).click();
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(
      () => (window as unknown as Record<string, number>)["__inp"],
    ),
  ).toBeLessThan(150);
});

test("images always have dimensions and there are no third-party requests", async ({
  page,
}) => {
  const external: string[] = [];
  page.on(
    "request",
    (r) =>
      !r.url().startsWith("http://localhost:4321") &&
      !r.url().startsWith("data:") &&
      external.push(r.url()),
  );
  await page.goto("/blog/zero-javascript-by-default", {
    waitUntil: "networkidle",
  });
  expect(external).toEqual([]);
  const missing = await page.evaluate(() =>
    [...document.images]
      .filter((i) => !i.getAttribute("width") || !i.getAttribute("height"))
      .map((i) => i.src),
  );
  expect(missing).toEqual([]);
});

test("the primary font is preloaded and self-hosted", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="preload"][as="font"]')).toHaveAttribute(
    "href",
    "/fonts/inter-latin-wght-normal.woff2",
  );
});
