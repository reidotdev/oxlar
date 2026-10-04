# React islands

This file arrived with the **react-islands module**. The base template ships no React: a page that needs none ships none. Add React only for a widget whose accessibility you cannot match with native HTML, such as a rich combobox, a date picker or a listbox with custom popover and typeahead. React Aria Components (already added) gives those behaviours.

## Rules

- Islands live in `src/islands/react/`. `verify:template` allows React imports only there.
- Hydrate lazily: `client:visible` for below-the-fold widgets, `client:idle` otherwise. Never `client:load` unless the widget is the first thing the visitor uses.
- Style with the design tokens. There is no Tailwind. Use RAC's `data-*` state attributes (`data-hovered`, `data-pressed`, `data-focus-visible`, `data-selected`, `data-disabled`) in a CSS file inside `@layer components`.
- Keep the focus ring: `outline: var(--ring-width) solid var(--ring)` on `[data-focus-visible]`.
- Pass data as props from the `.astro` page; do not fetch from Sanity inside an island.
- Add it to `/styleguide` with every state, and add a keyboard test.

## Cost

React plus react-dom is roughly 45 KB gzipped before your component. The 50 KB initial JS budget in `scripts/check-bundle-size.ts` only applies to pages with `data-motion`; pages with an island are reported but not failed. Decide the budget for those pages and write it down in `docs/architecture.md`.

## Using it

```astro
---
import ExampleIsland from "../islands/react/ExampleIsland.tsx";
---

<ExampleIsland client:visible />
```

The React Aria MCP (`npx @react-aria/mcp`) gives current component APIs; add it to `.mcp.json` when you work on islands.
