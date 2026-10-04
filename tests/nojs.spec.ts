import { expect, test } from "@playwright/test";

test.use({ javaScriptEnabled: false });

test("key pages are fully readable and navigable without JS", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "oxlar" }),
  ).toBeVisible();
  // html.js is never set, so reveal sections are visible, not stuck hidden.
  await expect(
    page.getByRole("heading", { name: "Latest posts" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Latest posts" })).toHaveCSS(
    "opacity",
    "1",
  );
  await page.getByRole("link", { name: "About", exact: true }).first().click();
  await expect(
    page.getByRole("heading", { level: 1, name: "About" }),
  ).toBeVisible();
  await page.goto("/blog/zero-javascript-by-default");
  await expect(
    page.getByRole("article").getByRole("heading", { level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: /gradient/ })).toBeVisible();
});

test("tabs degrade to labelled panels and disclosure still works", async ({
  page,
}) => {
  await page.goto("/styleguide");
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Specs" })).toBeVisible();
  await page
    .locator("details", { hasText: "Are these exclusive?" })
    .locator("summary")
    .click();
  await expect(
    page.getByText("Yes, a shared name makes an accordion."),
  ).toBeVisible();
});

test("native form validation still applies without JS", async ({ page }) => {
  await page.goto("/styleguide");
  const email = page.getByLabel("Email *");
  expect(await email.evaluate((el: HTMLInputElement) => el.required)).toBe(
    true,
  );
});

test("a dialog opens without JS through invoker commands (where supported)", async ({
  page,
}) => {
  await page.goto("/styleguide");
  const supported = await page.evaluate(
    () => "commandForElement" in HTMLButtonElement.prototype,
  );
  test.skip(
    !supported,
    "Invoker Commands are not supported by this browser build",
  );
  await page.getByRole("button", { name: "Open dialog" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
