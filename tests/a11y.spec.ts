import { expect, test } from "@playwright/test";
import { axeViolations, routes } from "./helpers.ts";

/**
 * Keyboard focus ring: asserted on the computed style of a really focused
 * element. Class names and source text cannot prove an outline paints.
 */
test("every keyboard-focused control paints a visible focus ring", async ({
  page,
}) => {
  await page.goto("/styleguide");
  const seen: string[] = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const style = getComputedStyle(el);
      return {
        label: (el.textContent || el.getAttribute("aria-label") || el.tagName)
          .trim()
          .slice(0, 40),
        focusVisible: el.matches(":focus-visible"),
        outlineStyle: style.outlineStyle,
        outlineWidth: parseFloat(style.outlineWidth),
      };
    });
    if (!focused?.focusVisible) continue;
    seen.push(focused.label);
    expect(
      focused.outlineStyle,
      `"${focused.label}" has outline-style: ${focused.outlineStyle}`,
    ).not.toBe("none");
    expect(
      focused.outlineWidth,
      `"${focused.label}" has no outline width`,
    ).toBeGreaterThan(0);
  }
  // Guard the guard: if tabbing found nothing, the assertions above passed vacuously.
  expect(seen.length, "no focus-visible controls were reached").toBeGreaterThan(
    10,
  );
});

test("focus order starts at the skip link, then the header", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "oxlar", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("navigation", { name: "Primary" }).getByRole("link").first(),
  ).toBeFocused();
});

test("skip link moves focus to main", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});

for (const scheme of ["light", "dark"] as const) {
  for (const route of routes) {
    test(`axe: ${route} (${scheme})`, async ({ page }) => {
      // Reduced motion settles the page deterministically: axe sampling a mid-fade
      // reveal sees semi-transparent text and reports a (real, but transient) contrast failure.
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: scheme });
      await page.goto(route, { waitUntil: "networkidle" });
      expect(await axeViolations(page), "axe reported violations").toEqual([]);
    });
  }
}

test("axe: 404 page", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const response = await page.goto("/does-not-exist", {
    waitUntil: "networkidle",
  });
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { level: 1, name: "Page not found" }),
  ).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
});

test("axe: styleguide with an open dialog and menu", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/styleguide", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Options" }).click();
  expect(await axeViolations(page)).toEqual([]);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Open dialog" }).click();
  expect(await axeViolations(page)).toEqual([]);
});
