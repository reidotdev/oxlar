import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

export const routes = [
  "/",
  "/about",
  "/blog",
  "/blog/zero-javascript-by-default",
  "/blog/motion-without-the-cost",
  "/styleguide",
];

export async function axeViolations(page: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  // Report selectors, not just rule names: a bare "color-contrast" says nothing about which token pairing is wrong.
  return violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.map((n) => n.target.join(" ")).join("\n    ")}`,
  );
}
