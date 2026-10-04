/**
 * Progressive enhancement for native constraint validation. Without JS the
 * browser shows its own bubble. With it, the message appears in the field's
 * linked error element (read by screen readers through aria-describedby) and
 * clears as soon as the value becomes valid.
 */
type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function errorFor(control: Control): HTMLElement | null {
  return (
    control
      .closest(".field")
      ?.querySelector<HTMLElement>("[data-field-error]") ?? null
  );
}

function show(control: Control) {
  const error = errorFor(control);
  if (!error) return;
  error.textContent = control.validationMessage;
  control.setAttribute("aria-invalid", "true");
}

function clear(control: Control) {
  const error = errorFor(control);
  if (!error || !control.validity.valid) return;
  error.textContent = "";
  control.removeAttribute("aria-invalid");
}

document.addEventListener(
  "invalid",
  (event) => {
    const control = event.target as Control;
    if (!errorFor(control)) return;
    event.preventDefault(); // suppress the browser bubble; we render the message
    show(control);
    const form = control.form;
    if (form && form.querySelector(":invalid") === control) control.focus();
  },
  true,
);

for (const type of ["input", "change"]) {
  document.addEventListener(type, (event) => clear(event.target as Control));
}

document.addEventListener("focusout", (event) => {
  const control = event.target as Control;
  if (
    control instanceof HTMLElement &&
    control.matches("input, textarea, select") &&
    errorFor(control)
  ) {
    if (!control.validity.valid && control.value !== "") show(control);
  }
});

// Indeterminate is a property, not an attribute.
document
  .querySelectorAll<HTMLInputElement>("input[data-indeterminate]")
  .forEach((input) => {
    input.indeterminate = true;
    input.addEventListener(
      "change",
      () => input.removeAttribute("data-indeterminate"),
      { once: true },
    );
  });
