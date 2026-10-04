---
name: add-component
description: Add or restyle a zero-JS Astro component in oxlar (native HTML, tokens only) and land it in /styleguide with every variant and state. Use for any new UI component or when re-skinning an existing one.
---

# Add a component

The component set is a starting point, not a ceiling. The rule: **native HTML first, tokens only, accessible without JS.**

## Steps

1. **Native element first.** Reach for `<button>`, `<a>`, `<dialog>`, `popover`, `<details name>`, `<form>` with constraint validation, `<nav>`, `<label>`. See the table in `docs/migration-inventory.md` for how each React Aria widget was replaced.
2. **Create `src/components/Name.astro`**: PascalCase, one component per file, no barrel. Typed `Props` interface. Extend `HTMLAttributes<"tag">` and forward rest props.
3. **Style with scoped CSS in the components layer**, tokens only:

   ```astro
   <style>
     @layer components {
       .thing {
         padding: var(--space-3) var(--space-4);
         border-radius: var(--radius-lg);
         background: var(--card);
         color: var(--card-foreground);
         &[data-variant="outline"] {
           border: var(--border-width) solid var(--border);
         }
         &:hover {
           background: var(--accent);
         }
       }
     }
   </style>
   ```

   Express variants as `data-*` attributes. State comes from the platform (`:hover`, `:active`, `:disabled`, `:checked`, `:invalid`, `[aria-*]`). The global `:focus-visible` ring comes from `base.css`; do not remove it.

4. **No raw values.** Stylelint fails on colour literals and px spacing/type. Missing a value? Add a token to `tokens.css`, do not inline it.
5. **Keyboard and screen readers.** Visible focus, correct roles, labels linked with `for`/`aria-labelledby`, errors linked with `aria-describedby`. Honour `forced-colors` for anything drawn with backgrounds.
6. **Behaviour beyond the platform** goes in `src/islands/` (see `add-island`), imported from the component. If the widget is too complex to build accessibly (rich combobox, date picker, listbox with typeahead), STOP and recommend the opt-in `react-islands` module instead.
7. **Add it to `src/pages/styleguide.astro`** with every variant and state: default, disabled, invalid, checked, with description, on a `data-surface="dark"` section. `verify:template` fails if the import is missing.

## Check

`pnpm typecheck && pnpm lint && pnpm verify:template && pnpm test`. Axe runs against `/styleguide` in light and dark, so a contrast failure in any variant shows up there. Keyboard behaviour needs a test in `tests/components.spec.ts`.
