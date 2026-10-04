import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/styleguide", { waitUntil: "networkidle" });
});

test.describe("form behaviour", () => {
  test("an invalid field shows its message in the linked error element", async ({
    page,
  }) => {
    const email = page.getByLabel("Email *");
    await email.fill("not-an-email");
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(email).toHaveAttribute("aria-invalid", "true");
    const describedby = await email.getAttribute("aria-describedby");
    expect(describedby).toContain("email-error");
    await expect(page.locator("#email-error")).not.toBeEmpty();
    await expect(email).toBeFocused();
    // Clears as soon as the value becomes valid.
    await email.fill("a@b.co");
    await expect(email).not.toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#email-error")).toBeEmpty();
  });

  test("a field with a server-provided error is announced as invalid", async ({
    page,
  }) => {
    const field = page.getByLabel("With error");
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(field).toHaveAccessibleDescription("Enter a valid value.");
  });

  test("radio group is a labelled fieldset", async ({ page }) => {
    await expect(page.getByRole("group", { name: "Plan" })).toBeVisible();
    await page.getByLabel("Free").check();
    await expect(page.getByLabel("Pro")).not.toBeChecked();
    await expect(page.getByLabel("Team")).toBeDisabled();
  });

  test("indeterminate checkbox clears when toggled", async ({ page }) => {
    const box = page.getByLabel("Indeterminate");
    expect(await box.evaluate((el: HTMLInputElement) => el.indeterminate)).toBe(
      true,
    );
    await box.check();
    expect(await box.evaluate((el: HTMLInputElement) => el.indeterminate)).toBe(
      false,
    );
  });
});

test.describe("dialog", () => {
  test("opens modally, keeps focus out of the inert page, closes on Escape and restores focus", async ({
    page,
  }) => {
    const opener = page.getByRole("button", { name: "Open dialog" });
    await opener.click();
    const dialog = page.getByRole("dialog", { name: "Dialog title" });
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("Tab");
      expect(
        await page.evaluate(
          () =>
            document.activeElement === document.body ||
            !!document.activeElement?.closest("dialog"),
        ),
      ).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test("closes from its own buttons and a backdrop click", async ({ page }) => {
    const opener = page.getByRole("button", { name: "Open dialog" });
    await opener.click();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await opener.click();
    await page.mouse.click(5, 5);
    await expect(page.getByRole("dialog")).toBeHidden();
  });
});

test.describe("menu", () => {
  test("arrow keys move through items, Escape closes and returns focus", async ({
    page,
  }) => {
    const trigger = page.getByRole("button", { name: "Options" });
    await trigger.click();
    await expect(page.getByRole("menuitem", { name: "Edit" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(
      page.getByRole("menuitem", { name: "Duplicate" }),
    ).toBeFocused();
    await page.keyboard.press("End");
    await expect(page.getByRole("menuitem", { name: "Docs" })).toBeFocused(); // Delete is disabled, so skipped
    await page.keyboard.press("Home");
    await expect(page.getByRole("menuitem", { name: "Edit" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  test("ArrowDown on the closed trigger opens it", async ({ page }) => {
    await page.getByRole("button", { name: "Options" }).focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("menu")).toBeVisible();
  });
});

test.describe("tabs", () => {
  test("builds a tablist with roving tabindex and arrow-key navigation", async ({
    page,
  }) => {
    const list = page.getByRole("tablist", { name: "Demo tabs" });
    await expect(list.getByRole("tab")).toHaveCount(3);
    await expect(page.getByRole("tab", { name: "Overview" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await page.getByRole("tab", { name: "Overview" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Specs" })).toBeFocused();
    await expect(page.getByRole("tab", { name: "Specs" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByRole("tabpanel", { name: "Specs" })).toBeVisible();
    await expect(page.getByRole("tabpanel", { name: "Overview" })).toBeHidden();
    await page.keyboard.press("End");
    await expect(page.getByRole("tab", { name: "Reviews" })).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Overview" })).toBeFocused();
  });
});

test.describe("disclosure and tooltip", () => {
  test("a shared name makes an exclusive accordion", async ({ page }) => {
    const first = page.locator("details", {
      hasText: "Does it need JavaScript?",
    });
    const second = page.locator("details", { hasText: "Are these exclusive?" });
    await expect(first).toHaveAttribute("open", "");
    await second.locator("summary").click();
    await expect(second).toHaveAttribute("open", "");
    await expect(first).not.toHaveAttribute("open", "");
  });

  test("tooltip shows on focus and Escape dismisses it without moving focus", async ({
    page,
  }) => {
    const trigger = page.getByRole("button", { name: "Notifications" }).last();
    const tip = page.getByRole("tooltip");
    await trigger.focus();
    await expect(tip).toBeVisible();
    await expect(trigger).toHaveAccessibleDescription("Notifications");
    await page.keyboard.press("Escape");
    await expect(tip).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});
