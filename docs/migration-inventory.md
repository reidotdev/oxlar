# Migration inventory: BMT-214A to oxlar

Phase 0 deliverable. Source: `reidotdev/BMT-214A` at `339fd5b`. Target: `reidotdev/oxlar` (was empty, no commits, when this was written).

## Summary and spec contradictions

---

BMT-214A is much smaller than the spec assumes. Nothing blocks the rewrite, but these points differ from the spec and were resolved as noted.

- **One route.** There is only `/` (plus `/studio`, `robots`, `sitemap`, `opengraph-image` and two draft-mode API routes). `[slug]`, `blog/[slug]`, `404`, `styleguide` and RSS do not exist and are new in oxlar.
- **One Sanity type.** The schema has only `page` (`title`, `slug`, `excerpt`, `body`). There is no blog, no site settings and no SEO fields. oxlar keeps `page` unchanged and adds optional, additive types only (`siteSettings`, `post`, an optional `seo` object). Existing datasets keep working. Required-SEO validation therefore falls back to `title` and `excerpt` instead of failing.
- **One GSAP animation.** `Reveal` (ScrollTrigger, `from` opacity and y 24, 0.8 s, `power3.out`, `top 85%`, once, reduced-motion skip). No other plugins.
- **Astro version.** The spec locks Astro 6. npm `latest` is 7.3.5; `astro@6` resolves to 6.4.x. oxlar pins the latest 6.x as locked. Moving to 7 is a separate decision.
- **Scaffold language.** `scripts/setup.mjs` is plain JavaScript (1285 lines). The spec wants `scripts/scaffold.ts`; the port is TypeScript run with Node 22's native type stripping.
- **Skills layout.** Skills are flat files in `.claude/skills/*.md`, not folders.
- **Env var names.** BMT uses `NEXT_PUBLIC_SANITY_*`, `SANITY_API_READ_TOKEN`, `NEXT_PUBLIC_SITE_URL`. oxlar uses the spec's names.
- **Defaults taken for the open questions (section 18):** nested `studio/` package (included in the pnpm workspace so one install and one lockfile cover it); preview mode deferred to phase 2; Cloudflare Workers as scaffold default; React Aria island flagged only for the rich `Select` case (see Components).

## Routes

---

| Route | File | Renders |
| --- | --- | --- |
| `/` | `src/app/page.tsx` | Hero in `Reveal`, `Showcase` (live demo of every UI component), list of Sanity `page` documents (or a "not configured" note) |
| `/studio/[[...tool]]` | `src/app/studio/[[...tool]]/page.tsx` | Embedded Sanity Studio (`force-static`) |
| `/api/draft-mode/enable` | `src/app/api/draft-mode/enable/route.ts` | Enables Next draft mode via `defineEnableDraftMode`; 404 without a read token |
| `/api/draft-mode/disable` | `.../disable/route.ts` | Disables draft mode, redirects to `/` |
| `/robots.txt` | `src/app/robots.ts` | Allow `/`, disallow `/studio/`, sitemap link |
| `/sitemap.xml` | `src/app/sitemap.ts` | Home URL only |
| `/opengraph-image` | `src/app/opengraph-image.tsx` | 1200x630, `#0a0a0a` background, white 72px site name, `#a3a3a3` 32px description, `sans-serif` |

Layout (`layout.tsx`): `<html lang="en">`, Inter via `next/font` (`--font-inter`, swap), metadata (title template `%s · name`, OG, Twitter `summary_large_image`), `Providers` (RAC `RouterProvider` bridging Next's router), `SanityLive` when configured. `providers.tsx` and `SanityLive` have no equivalent in oxlar (no client router, no live content).

## Components

---

All of `src/components/ui/*` wrap React Aria Components (RAC) and style with Tailwind `data-[state]` variants. Shared helpers in `ui/styles.ts`: `focusRing`, `fieldBorder`. Utility `cn()` (clsx + tailwind-merge).

| Component | Props / variants | States | RAC dependency | oxlar replacement |
| --- | --- | --- | --- | --- |
| `Button` | `variant`: primary, secondary, outline, ghost, destructive; `size`: sm, md, lg, icon; all RAC button props | hover, pressed, focus-visible, disabled | `Button` | `Button.astro`, native `<button>` or `<a>` |
| `Link` | `variant`: default, muted, button | hover, focus-visible, disabled | `Link` | `Link.astro`, native `<a>` |
| `TextField` | label, description, errorMessage, type, placeholder | hover, focus-within, invalid, disabled | `TextField`, `Input`, `Label`, `Text`, `FieldError` | `TextField.astro`, native `<input>` + constraint validation, `aria-describedby` |
| `TextArea` | as `TextField`, rows | same | `TextField`, `TextArea` | `TextArea.astro` |
| `Select` / `SelectItem` | label, description, placeholder, errorMessage, items, `defaultSelectedKey` | hover, focused item, selected item (check), disabled, placeholder | `Select`, `Popover`, `ListBox`, `ListBoxItem` | `Select.astro` on native `<select>`. **Flag:** loses the custom popover list styling and typeahead-in-popover chrome. If a rich listbox is needed, use the opt-in React Aria island module. |
| `Checkbox` | `defaultSelected`, indeterminate | hover, selected, indeterminate, focus-visible, disabled | `Checkbox` | `Checkbox.astro`, native `<input type=checkbox>` |
| `RadioGroup` / `Radio` | label, value | hover, selected, focus-visible, disabled | `RadioGroup`, `Radio` | `RadioGroup.astro` with `<fieldset>`/`<legend>`, native radios |
| `Modal` / `DialogTrigger` / `DialogTitle` | `isDismissable`; slot="close" buttons | entering/exiting animation, focus trap | `ModalOverlay`, `Modal`, `Dialog`, `Heading` | `Dialog.astro` on native `<dialog>` + small controller in `src/islands/` |
| `Menu` / `MenuItem` / `MenuTrigger` | `popoverProps` | focused, disabled, entering/exiting | `MenuTrigger`, `Menu`, `MenuItem`, `Popover` | `Menu.astro` on Popover API + keyboard enhancement island |
| `Tabs` / `TabList` / `Tab` / `TabPanel` | orientation | hover, selected, focus-visible, disabled | `Tabs` family | `Tabs.astro` as a web component; without JS all panels render stacked |
| `Tooltip` / `TooltipTrigger` | `showArrow`, `offset` | entering/exiting | `Tooltip`, `OverlayArrow` | `Tooltip.astro`, CSS show on hover/focus, island for Escape dismissal (WCAG 1.4.13) |
| `Label`, `Description`, `FieldError` | className | disabled | RAC primitives | folded into field components |
| `Section` (layout) | `surface`: default, dark, light; `bandClassName`; `backdrop` slot | n/a | none | `Section.astro` (same props; named slot `backdrop`) |
| `BackgroundVideo` (media) | `src`, `poster`; muted, playsInline, loop, autoplay, aria-hidden, reduced-motion pause with live listener | n/a | none | `BackgroundVideo.astro` + tiny island for the reduced-motion listener |
| `Reveal` (motion) | `delay`, `y` | n/a | `@gsap/react` | `data-motion="reveal"` attributes, `src/motion/reveal.ts` |
| `Showcase` | demo only, "delete per project" | n/a | all of the above | replaced by `/styleguide` |

New in oxlar (spec): Heading, Text, Card, Badge, Tag, Divider, Container, Grid, Disclosure, Icon, SanityImage, SEO, Portable Text components.

Icons: `lucide-react` is used for `ArrowUpRight`, `Bell`, `ChevronDown`, `Check`, `Minus`. oxlar inlines SVGs in `src/icons/`.

## Token system

---

File: `src/app/globals.css`. Two layers:

1. **Palette** (the only place colour literals appear, all `oklch`): `--paper`, `--ink`, `--ink-muted`, `--line`, `--surface`, `--surface-strong`, `--dark`, `--dark-raised`, `--dark-surface`, `--dark-muted`, `--dark-accent`, `--dark-line`, `--dark-input`, `--on-dark`, `--on-dark-muted`, `--brand`, `--brand-on`, `--brand-light`, `--danger`, `--on-danger`, `--radius` (0.625rem).
2. **Semantic**: `--background`, `--foreground`, `--card(-foreground)`, `--primary(-foreground)`, `--secondary(-foreground)`, `--muted(-foreground)`, `--accent(-foreground)`, `--destructive(-foreground)`, `--border`, `--input`, `--ring`.

Theming mechanisms: `:root` and `[data-surface="light"]` (light mapping); `:root[data-theme="dark"]` and `[data-surface="dark"]` (dark mapping, also a section scope); `@media (prefers-color-scheme: dark)` on `:root:not([data-theme="light"])`.

Tailwind `@theme inline` mapping (recorded here as required): `--color-X: var(--X)` for each semantic token; `--font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif`; `--radius-sm/md/lg/xl` = `radius -4px / -2px / radius / +4px`. oxlar keeps every palette and semantic name unchanged as plain custom properties, and exposes the radii as `--radius-sm/md/lg/xl` and the font as `--font-sans`. `docs/design.md` token names therefore stay valid. Tailwind opacity shorthands (`bg-primary/90`) become `color-mix(in oklch, var(--primary) 90%, transparent)`.

Known token constraints to carry over: `--ink-muted` must clear 4.5:1 on `--muted` and `--secondary` (0.52, worst case 4.90:1). Tailwind tree-shaking gotcha (3) disappears without Tailwind.

## Sanity

---

- **Schema:** `page` document: `title` (string, required), `slug` (slug, source title, required), `excerpt` (text, 3 rows), `body` (array of `block`). Preview: title / `slug.current`. Registered in `schemaTypes/index.ts`. `structure.ts`: one list item "Pages".
- **Plugins:** `structureTool`, `visionTool`. `basePath: "/studio"` (embedded; oxlar hosts the Studio separately).
- **Queries:** one, `pagesQuery`: `*[_type == "page"] | order(title asc){ _id, title, "slug": slug.current, excerpt }`, via `defineQuery`.
- **Client:** `createClient` with `useCdn: false`, `apiVersion` default `2024-10-01`; `@sanity/client` pinned to 7.26.2 via pnpm override. `live.ts` uses `defineLive` (`sanityFetch`, `SanityLive`) with an optional read token.
- **Images:** `urlFor()` via `@sanity/image-url`. `next.config.ts` allows `cdn.sanity.io`. No image fields in the schema yet.
- **Portable Text:** the schema has `body` blocks, but nothing renders them.
- **Typegen:** `sanity schema extract && sanity typegen generate`; `schema.json` and `sanity.types.ts` are gitignored. oxlar commits the generated types (spec 5.5).
- **Guards:** `env.ts` strips quotes and whitespace, validates project id and dataset, exports `sanityConfigured` and `safeProjectId`. Invariants around these are in verify-template. The same "degrade to not configured" idea is kept in oxlar (fixtures when no project id is set) so the build stays green without credentials.
- **Env:** `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_SANITY_API_VERSION`, `SANITY_API_READ_TOKEN`, `NEXT_PUBLIC_SITE_URL`.

## GSAP

---

Only `src/components/motion/reveal.tsx`: plugin `ScrollTrigger` (+ `useGSAP`), `gsap.from(el, { opacity: 0, y (default 24), duration: 0.8, delay, ease: "power3.out", scrollTrigger: { start: "top 85%", once: true } })`, skipped when `prefers-reduced-motion: reduce`. Used 3 times on `/`. The hero is wrapped too (this is the LCP pattern the spec forbids; oxlar animates the hero from a visible state).

## SEO

---

- Metadata API in `layout.tsx` (title template, description, OG, Twitter card, `metadataBase`).
- `sitemap.ts` (home only), `robots.ts` (disallows `/studio/`).
- `opengraph-image.tsx`: one site-wide image (no per-page images).
- `src/lib/site.ts`: `siteConfig` (`name`, `description`, `url`).
- No JSON-LD, no RSS, no analytics.

## Scaffold script (`scripts/setup.mjs`)

---

Flags: `--modules-only`; `--config <file> --non-interactive`. Prompts are keyed (`name`, `siteUrl`, `github.push`, `sanity.mode`, ...) so a config file can answer them. Answers for remote steps: `true`, `false`, `"later"`.

| Step | What it does | Prompts / config keys |
| --- | --- | --- |
| 1 Project details | name, slug, description, site URL; rewrites siteConfig, package name | `name`, `description`, `siteUrl` |
| 2 Environment | `.env.local` from `.env.example` | none |
| 3 Git | initial commit when needed | none |
| 4 GitHub | push to existing origin, or `gh repo create --private` | `github.push`, `github.create` |
| 5 Sanity | login check, create or reuse project, dataset, organization, optional read token, CORS origins (localhost + production, with credentials), writes unquoted `.env.local` | `sanity.mode/projectId/dataset/organization/token/cors`, `sanity.login` |
| 6 Template invariants | runs `verify-template` | none |
| 7 Optional modules | table-driven (`MODULES`: id, label, description, dependencies, devDependencies, files) | `modules.<id>` |
| 8 Vercel | `vercel link --yes`, push env vars (localhost URL to development only), optional `vercel --prod --yes` | `vercel.link/deploy/scope` |

Failures in remote steps are reported and deferred to a closing to-do list. Push step checks common ancestry first. oxlar replaces step 8 with Cloudflare.

## Opt-in modules

---

One module, `three`: adds `three`, `@types/three`, and copies `scripts/modules/three/3d.md` to `docs/3d.md` (239-line recipe for keeping WebGL out of the main bundle). No starter component by design. oxlar keeps the same table-driven mechanism and adds `react-islands` and `preview`.

## Tests, invariants, CI

---

- **Playwright** (`e2e/a11y.spec.ts`, Chromium only, runs against a production build): keyboard focus ring computed-style test (Tab through 6 controls), axe on `/` (wcag2a/2aa/21a/21aa) with reduced motion emulated.
- **`verify-template.mjs`** (Node built-ins only), checks: `env.ts` exports guards; `env.ts` validates and strips quotes; any `.env.local` is usable; focus ring restores outline-style; typecheck runs `next typegen`; ESLint ignores are `**/`-prefixed; every schema type registered; Sanity packages share a major; no script shadows a pnpm built-in; `next/image` allows Sanity CDN. Most are Next/Tailwind-specific and are replaced.
- **CI** (`ci.yml`): job `verify` (verify-template, lint, typecheck, format check, build with `NEXT_PUBLIC_SITE_URL=https://example.com`); job `e2e` (Chromium install, `pnpm test:e2e`, upload report on failure).
- **Tooling:** ESLint 9 (`eslint-config-next`), Prettier with Tailwind plugin, `.nvmrc` 22, pnpm 10.33.0, Storybook 10 (`.storybook/*`, 13 stories, `docs/storybook.md`).

## Docs, skills, config

---

- `docs/design.md` (template for discovery, section 4 is about RAC modifications), `docs/deploy.md` (Vercel), `docs/storybook.md`, `README.md`, `CLAUDE.md` (285 lines incl. 13 gotchas), `AGENTS.md` (Next.js docs notice).
- Skills: `design-discovery`, `restyle-component`, `technical-plan`, `scaffold-headless`.
- `.mcp.json`: `react-aria` MCP only (no Sanity MCP).
- `scaffold.config.example.json`, `.prettierrc.json`, `.prettierignore`, `.gitignore` (ignores `/public/video/` deliberately), `LICENSE` (MIT).

## Items not covered by the spec (decisions)

---

Nothing is deleted from BMT-214A. For oxlar:

| Item | Decision |
| --- | --- |
| Next draft-mode routes, `SanityLive`, `defineLive` | Dropped (static output); preview is phase 2 |
| Storybook and `docs/storybook.md` | Replaced by `/styleguide`; doc not ported |
| `technical-plan` skill, `3d.md` module, LICENSE, `.gitignore` video rule | Ported |
| 13 gotchas in `CLAUDE.md` | Only those still true are carried into `AGENTS.md` (env quoting, scaffold wrong directory, `pnpm setup` collision, contrast measured on darkest surface, Sanity CORS, `sanity init` clobbering) |
| `Showcase` | Content becomes `/styleguide` |
