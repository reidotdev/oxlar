/**
 * Tooltips show on hover/focus with CSS alone. This adds the one thing CSS
 * cannot: Escape dismisses the tooltip without moving focus (WCAG 1.4.13).
 * The dismissal lasts until the pointer leaves or focus moves away.
 */
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  document.querySelectorAll<HTMLElement>("[data-tooltip]").forEach((tip) => {
    if (tip.matches(":hover, :focus-within"))
      tip.setAttribute("data-dismissed", "");
  });
});

const reset = (event: Event) => {
  (event.target as Element | null)
    ?.closest?.("[data-tooltip]")
    ?.removeAttribute("data-dismissed");
};
document.addEventListener("pointerout", reset);
document.addEventListener("focusout", reset);
