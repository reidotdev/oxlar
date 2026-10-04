/**
 * Native <dialog> controller. Openers are any element with data-dialog-open="<id>".
 * Close buttons are plain <form method="dialog"> submits and need no script.
 * The script adds backdrop-click dismissal and scroll locking.
 */
function dialogFor(el: Element | null): HTMLDialogElement | null {
  const id =
    el?.closest<HTMLElement>("[data-dialog-open]")?.dataset["dialogOpen"];
  const dialog = id ? document.getElementById(id) : null;
  return dialog instanceof HTMLDialogElement ? dialog : null;
}

document.addEventListener("click", (event) => {
  const target = event.target as Element | null;
  const opener = dialogFor(target);
  if (opener) {
    if (!opener.open) opener.showModal();
    return;
  }
  // Click on the backdrop lands on the <dialog> element itself.
  if (
    target instanceof HTMLDialogElement &&
    target.open &&
    target.dataset["dismissable"] !== undefined
  ) {
    const box = target.getBoundingClientRect();
    const inside =
      event.clientX >= box.left &&
      event.clientX <= box.right &&
      event.clientY >= box.top &&
      event.clientY <= box.bottom;
    if (!inside) target.close();
  }
});

// A non-dismissable dialog also ignores Escape.
document.addEventListener(
  "cancel",
  (event) => {
    const target = event.target;
    if (
      target instanceof HTMLDialogElement &&
      target.dataset["dismissable"] === undefined
    )
      event.preventDefault();
  },
  true,
);

document.addEventListener(
  "toggle",
  (event) => {
    if (event.target instanceof HTMLDialogElement) {
      document.documentElement.toggleAttribute(
        "data-scroll-locked",
        document.querySelector("dialog[open]") !== null,
      );
    }
  },
  true,
);
