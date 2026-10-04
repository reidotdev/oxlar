/**
 * Keyboard behaviour for Popover-API menus (WAI-ARIA menu button pattern).
 * The Popover API supplies open/close, light dismiss, Escape and focus return.
 * This adds: focus the first item on open, arrow/Home/End/typeahead, Tab closes,
 * and positioning where CSS anchor positioning is unavailable.
 */
const anchorSupported = CSS.supports("position-area", "bottom");

function items(menu: HTMLElement): HTMLElement[] {
  return [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')].filter(
    (el) =>
      !el.hasAttribute("disabled") &&
      el.getAttribute("aria-disabled") !== "true",
  );
}

function trigger(menu: HTMLElement): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[popovertarget="${menu.id}"]`);
}

document.addEventListener(
  "toggle",
  (event) => {
    const menu = event.target;
    if (!(menu instanceof HTMLElement) || !menu.matches("[data-menu]")) return;
    const opener = trigger(menu);
    const open = (event as ToggleEvent).newState === "open";
    opener?.setAttribute("aria-expanded", String(open));
    if (!open) return;
    if (!anchorSupported && opener) {
      const rect = opener.getBoundingClientRect();
      menu.style.position = "fixed";
      menu.style.insetBlockStart = `${rect.bottom + 4}px`;
      menu.style.insetInlineStart = `${rect.left}px`;
    }
    items(menu)[0]?.focus();
  },
  true,
);

document.addEventListener("keydown", (event) => {
  const menu = (event.target as Element | null)?.closest<HTMLElement>(
    "[data-menu]",
  );
  const opener = (event.target as Element | null)?.closest<HTMLElement>(
    "[popovertarget]",
  );

  // Arrow down/up on the closed trigger opens the menu.
  if (
    opener &&
    !menu &&
    (event.key === "ArrowDown" || event.key === "ArrowUp")
  ) {
    const target = document.getElementById(
      opener.getAttribute("popovertarget") ?? "",
    );
    if (target?.matches("[data-menu]")) {
      event.preventDefault();
      target.showPopover();
    }
    return;
  }
  if (!menu) return;

  const list = items(menu);
  const index = list.indexOf(document.activeElement as HTMLElement);
  const focusAt = (i: number) => list[(i + list.length) % list.length]?.focus();

  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      focusAt(index + 1);
      break;
    case "ArrowUp":
      event.preventDefault();
      focusAt(index - 1);
      break;
    case "Home":
      event.preventDefault();
      focusAt(0);
      break;
    case "End":
      event.preventDefault();
      focusAt(-1);
      break;
    case "Tab":
      menu.hidePopover();
      break;
    default:
      if (
        event.key.length === 1 &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        const letter = event.key.toLowerCase();
        const ordered = [...list.slice(index + 1), ...list.slice(0, index + 1)];
        ordered
          .find((el) => el.textContent?.trim().toLowerCase().startsWith(letter))
          ?.focus();
      }
  }
});

// Activating an item closes the menu.
document.addEventListener("click", (event) => {
  const item = (event.target as Element | null)?.closest<HTMLElement>(
    '[data-menu] [role="menuitem"]',
  );
  item?.closest<HTMLElement>("[data-menu]")?.hidePopover();
});
