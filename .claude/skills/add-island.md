---
name: add-island
description: Add a small vanilla JavaScript island (or web component) to oxlar for behaviour the platform cannot do alone. Use when a component needs client-side script, such as keyboard handling, focus management or enhancement of native elements.
---

# Add an island

Islands are the **only** place client JS lives besides `src/motion/`. They are small, framework-free and progressive: the page works without them wherever the platform allows.

## Rules

- File: `src/islands/<name>.ts`. Vanilla TypeScript, no framework, no dependency.
- Use **event delegation on `document`** and `data-*` hooks so one script serves every instance, or a **custom element** (`customElements.define("ui-name", ...)`) when the widget owns its markup (see `tabs.ts`).
- **Inert without its markup.** Importing the island on a page that lacks the widget must do nothing.
- **Enhance, do not replace.** The server HTML must already be usable: readable panels for tabs, a native `<dialog>` for a modal, native validation for forms.
- No `localStorage`/`sessionStorage`, no network calls, no timers that run forever.
- Do not set `style=` attributes in markup; setting a CSSOM property from script is allowed (the CSP does not block it).

## Wire it

Import it from the component that needs it. Astro bundles the script and ships it only on pages that render the component:

```astro
<script>
  import "../islands/<name>.ts";
</script>
```

Never write logic inside the `.astro` `<script>`; `verify:template` rejects it.

## Test it

Add a Playwright test: keyboard behaviour, ARIA state changes, and that the page is still usable with `javaScriptEnabled: false` (`tests/nojs.spec.ts`).

## Check

`pnpm perf:size`: a page using only this island must stay far under the 50 KB initial budget, and pages without the component must still ship 0 KB.
