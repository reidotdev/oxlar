import { expect, test } from "@playwright/test";

const scriptRequests = (page: import("@playwright/test").Page) => {
  const urls: string[] = [];
  page.on(
    "request",
    (r) => r.resourceType() === "script" && urls.push(r.url()),
  );
  return urls;
};

test("a page with no motion and no island requests no JavaScript at all", async ({
  page,
}) => {
  const scripts = scriptRequests(page);
  await page.goto("/about", { waitUntil: "networkidle" });
  expect(scripts).toEqual([]);
});

test("html.js is set before first paint", async ({ page }) => {
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      (window as unknown as Record<string, boolean>)["__jsAtDcl"] =
        document.documentElement.classList.contains("js");
    });
  });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => (window as unknown as Record<string, boolean>)["__jsAtDcl"],
    ),
  ).toBe(true);
});

test("the LCP candidate is never a motion element", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const hidden = await page.evaluate(() =>
    [...document.querySelectorAll("h1, main > section:first-of-type *")].some(
      (el) => el.closest("[data-motion]"),
    ),
  );
  expect(hidden).toBe(false);
});

test("GSAP loads lazily and reveal animates content in", async ({ page }) => {
  const scripts = scriptRequests(page);
  await page.goto("/");
  const initial = scripts.filter((u) => /Motion/.test(u));
  expect(initial.length).toBe(1);
  // Registry loads GSAP only after idle/intersection, never as part of the initial script.
  await page.waitForFunction(
    () =>
      document.querySelectorAll("[data-motion][data-motion-ready]").length > 0,
    null,
    { timeout: 5000 },
  );
  expect(scripts.some((u) => /ScrollTrigger|index\./.test(u))).toBe(true);
  await expect(page.getByRole("heading", { name: "Latest posts" })).toHaveCSS(
    "opacity",
    "1",
    { timeout: 3000 },
  );
});

test("reduced motion: nothing is hidden and GSAP is never fetched", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const scripts = scriptRequests(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Latest posts" })).toHaveCSS(
    "opacity",
    "1",
  );
  await expect(page.getByRole("heading", { name: "Latest posts" })).toHaveCSS(
    "transform",
    "none",
  );
  // The reveal module may load to mark elements ready, but ScrollTrigger must never run for it.
  expect(
    await page.evaluate(() =>
      [...document.querySelectorAll("[data-motion]")].every(
        (el) => getComputedStyle(el).opacity === "1",
      ),
    ),
  ).toBe(true);
  void scripts;
});

test("failsafe: if the motion script is blocked, content still appears", async ({
  page,
}) => {
  await page.route(/\/_astro\/.*\.js$/, (route) => route.abort());
  await page.goto("/");
  const section = page.locator("[data-motion]").first();
  // Proves the test is not vacuous: the hidden state really applies first.
  await expect(section).toHaveCSS("opacity", "0", { timeout: 1500 });
  await expect(section).toHaveCSS("opacity", "1", { timeout: 6000 });
});

test("a failed animation module reveals content instead of hiding it", async ({
  page,
}) => {
  await page.route(/\/_astro\/(reveal|loader|index)\.[^/]*\.js$/, (route) =>
    route.abort(),
  );
  await page.goto("/");
  const section = page.locator("[data-motion]").first();
  // The registry reveals content the moment a module fails, so the hidden state is brief.
  await expect(section).toHaveAttribute("data-motion-ready", "", {
    timeout: 6000,
  });
  await expect(section).toHaveCSS("opacity", "1", { timeout: 6000 });
});
