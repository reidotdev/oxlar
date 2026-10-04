# oxlar: agent manual

oxlar is a lean, near-zero-JS website template for content-driven showcase, portfolio and blog sites. It replaces BMT-214A (Next.js) for pages that are mostly text, images and a few widgets. BMT-214A stays the template for app-like projects.

This file is the single source of truth for agents. `CLAUDE.md` only points here.

**Check the docs, not memory.** Astro, Sanity tooling and GSAP change between versions. Before writing integration code, look the API up through the Astro docs MCP server (`.mcp.json`, `astro-docs`) or the official docs. Never rely on remembered config options.

## Locked stack

| Area          | Decision                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------- |
| Framework     | Astro 6, `output: 'static'`, TypeScript strict. No SSR in the main site.                  |
| Styling       | Vanilla CSS, design tokens as custom properties. No Tailwind.                             |
| Interactivity | Zero-JS `.astro` components on native HTML, plus small vanilla islands in `src/islands/`. |
| Animation     | Plain `gsap` (+ plugins from the same package), lazy-loaded by `src/motion/`.             |
| CMS           | Sanity for ALL content. Studio hosted separately from `studio/`.                          |
| Hosting       | Cloudflare Workers static assets. Output stays host-agnostic.                             |
| Tooling       | pnpm 10, Node 22 LTS (>= 22.18 for native TypeScript scripts)                             |

Pinned versions live in `package.json` (exact, no `^`). Key ones: astro 6.4.8, gsap 3.15.0, @sanity/client 8.9.0, sanity 6.17.0 (studio), @playwright/test 1.63.0. Astro 7 exists on npm; moving to it is an owner decision.

### Do not

- Add React, Tailwind, UI libraries, or any new dependency without asking. React is allowed only as the opt-in `react-islands` module.
- Use inline `style=` attributes, or raw colours / px spacing / px font sizes outside `src/styles/tokens.css`.
- Fetch from Sanity outside `src/lib/sanity/`. Write GROQ only in `src/lib/sanity/queries.ts`.
- Add client JS outside `src/islands/` and `src/motion/`.
- Import `gsap` anywhere except `src/motion/loader.ts`, and never statically.
- Add analytics, third-party scripts, or `localStorage` / `sessionStorage`.
- Edit `src/lib/sanity/sanity.types.ts` by hand (run `pnpm sanity:types`).
- Run `sanity init` in this repo. It rewrites files it does not own. Use `sanity projects create` / `sanity projects list`.
- Skip, disable or quarantine a test to get green.

## Commands

| Task               | Command                                                                |
| ------------------ | ---------------------------------------------------------------------- |
| Dev server         | `pnpm dev` (http://localhost:4321)                                     |
| Build              | `PUBLIC_SITE_URL=https://example.com pnpm build`                       |
| Preview the build  | `pnpm preview`                                                         |
| Typecheck          | `pnpm typecheck` (`astro check` + `tsc --noEmit`)                      |
| Lint               | `pnpm lint` (ESLint + Prettier check + Stylelint)                      |
| Format             | `pnpm format`                                                          |
| Tests              | `pnpm test` (Playwright: keyboard, axe, no-JS, motion, SEO, vitals)    |
| Invariants         | `pnpm verify:template`                                                 |
| Bundle budgets     | `pnpm perf:size` (after a build)                                       |
| Lighthouse budgets | `pnpm perf` (after a build; needs Chrome: set `CHROME_PATH`)           |
| Sanity types       | `pnpm sanity:types` (extracts the schema and regenerates types)        |
| Studio (local)     | `pnpm --filter oxlar-studio dev`                                       |
| Studio (deploy)    | `pnpm --filter oxlar-studio deploy`                                    |
| Deploy the site    | `pnpm cf:deploy` (needs `CLOUDFLARE_API_TOKEN`; CI normally does this) |
| New project        | `pnpm scaffold` (or `--config scaffold.config.json --non-interactive`) |

Use `pnpm run <name>` when in doubt: `pnpm <name>` prefers pnpm's own built-in command of the same name. `verify:template` fails if a script name collides with one (`deploy` did, hence `cf:deploy`).

With a pre-installed browser (no `playwright install`), set `PW_CHROMIUM_PATH` to its executable.

## Directory map

```
src/pages/        routes: index, [slug], blog/index, blog/[slug], 404, styleguide,
                  robots.txt.ts, rss.xml.ts, og/[...slug].png.ts
src/layouts/      BaseLayout.astro (head, SEO, header, footer, html.js script)
src/components/   zero-JS .astro components, one per file, PascalCase, no barrels
  portable-text/  renderers for Sanity block content (RichText.astro is the entry)
src/islands/      the ONLY place client JS lives (besides src/motion)
src/motion/       GSAP: loader.ts, index.ts (registry), one module per pattern
src/lib/sanity/   client.ts, queries.ts, image.ts, validate.ts, fixtures.ts, sanity.types.ts
src/lib/          seo.ts, site.ts, field.ts, format.ts, brand-colors.ts, reserved.ts
src/styles/       global.css (layer order) + reset, tokens, base, utilities
src/icons/        SVG files used by Icon.astro
studio/           separate Sanity Studio package (schemaTypes/, structure.ts)
public/           fonts, favicons, _headers, _redirects, demo assets
tests/            Playwright specs
scripts/          scaffold.ts, verify-template.ts, check-bundle-size.ts, lighthouse.ts, modules/
docs/             design.md, architecture.md, publishing.md, deployment.md, comparison.md,
                  migration-inventory.md
```

## Definition of done

A task is done when all of these are green, and you have said which you ran:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm verify:template`
4. `pnpm test` (includes axe on every route and `/styleguide`, light and dark)
5. `pnpm build && pnpm perf:size` (and `pnpm perf` for anything touching layout, fonts, images or motion)

The build must pass with no Sanity credentials: without `SANITY_PROJECT_ID` the site renders the demo content in `src/lib/sanity/fixtures.ts`.

## Rules in short

### Tokens and CSS

- Every design value is a custom property in `src/styles/tokens.css`. Palette names were ported unchanged from BMT-214A (`--ink`, `--paper`, `--brand`, ...); components use the semantic layer (`--background`, `--primary`, `--muted-foreground`, ...).
- Cascade order is declared once in `global.css`: `reset, tokens, base, components, utilities`. Component `<style>` blocks wrap their rules in `@layer components { ... }`.
- Dark mode is one mapping using `light-dark()`. `<html data-theme="dark|light">` forces a page theme; `data-surface="dark|light"` scopes a section.
- Contrast is measured against the darkest surface a token renders on, not white. Red used as text uses `--destructive-text`, not `--destructive`.
- Use modern CSS: nesting, `:has()`, container queries, `clamp()` fluid type, logical properties, `color-mix()`, `@starting-style`, `prefers-reduced-motion`, `forced-colors`.
- Stylelint enforces no raw colours and no px spacing/type outside `tokens.css`. To make an exception, add a `stylelint-disable-next-line` comment with a reason. Prefer adding a token.

### Components

- One component per file, named props `Props` interface, native elements first (`<button>`, `<a>`, `<dialog>`, `popover`, `<details>`, `<form>`).
- Every interactive component works without JS where the platform allows, is fully keyboard operable, has a visible focus style from tokens, and meets WCAG 2.2 AA contrast.
- If a widget is too complex to build accessibly with native HTML, flag it and recommend the `react-islands` module. Do not build it badly.
- Every component appears in `src/pages/styleguide.astro` with every variant and state (`verify:template` checks the import).

### Motion

- Animate `transform` and `opacity` only.
- Hidden initial states live in CSS under `html.js` (set by the inline script in `BaseLayout`), never set by JS after paint. A CSS failsafe reveals everything after 3 s if the script never runs.
- Never put `data-motion` on the hero or any LCP element.
- Respect reduced motion through `gsap.matchMedia()`. Kill ScrollTriggers and timelines in the cleanup function. Remove `will-change` after the animation.
- Pages with no `data-motion` and no island ship 0 KB JS. `scripts/check-bundle-size.ts` enforces it and the 50 KB gzipped initial budget.
- Simple effects (hover, fade, `@starting-style`, view transitions) use CSS, not GSAP.

### Content (Sanity)

- Pages call `sanityFetch(query, params)` from `src/lib/sanity/client.ts` with a query exported from `queries.ts`. Identical calls share one request per build.
- Every Sanity image renders through `SanityImage.astro` (explicit width and height, srcset, `auto=format`, hotspot and crop).
- Block content renders through `portable-text/RichText.astro`. An unknown block type fails the build on purpose.
- `validateDocument()` fails the build with the document id on missing title, slug or image alt.
- Env values are written bare, no quotes (hosts store the bytes verbatim). `client.ts` strips quotes and validates, degrading to demo content with a warning.

## How to...

### Add a page

1. Content page from Sanity: create a `page` document. It is served at `/<slug>` by `src/pages/[slug].astro`. Slugs `blog`, `styleguide`, `og`, `404` are reserved.
2. A bespoke route: add `src/pages/<name>.astro` using `BaseLayout` and `buildSeo()`. Add its OG entry in `og/[...slug].png.ts` if it should have its own card. See `.claude/skills/add-page.md`.

### Add a component

Create `src/components/Name.astro` (props interface, native markup, `@layer components` scoped styles using tokens), add it to `/styleguide` with every variant and state, run the checks. See `.claude/skills/add-component.md`.

### Add an island

Create `src/islands/name.ts` (vanilla, event delegation, no framework), import it from the owning component with `<script>import "../islands/name.ts";</script>`. It must be inert without its markup. Add a Playwright test. See `.claude/skills/add-island.md`.

### Add an animation

Create `src/motion/<pattern>.ts` exporting `init(root)` that returns a cleanup, register it in `src/motion/index.ts`, add its CSS hidden state (if any) under `html.js` in `base.css`, and use `data-motion="<pattern>"`. See `.claude/skills/add-animation.md`.

### Add a Sanity document type

Schema in `studio/schemaTypes/`, register it, add the query to `queries.ts`, run `pnpm sanity:types`, add fixtures, wire a page, extend `validate.ts`. See `.claude/skills/add-sanity-type.md`.

## Gotchas that cost a day

1. **Quotes in env values.** `KEY="abc"` reads fine locally and is stored verbatim by hosts, quotes included. Write bare values. `client.ts` and `verify:template` guard it.
2. **`pnpm <name>` runs pnpm's built-in** when one exists (`pnpm setup` edited a shell profile). Script names avoid the built-ins.
3. **Contrast against the darkest surface.** `--muted-foreground` renders on `--muted` and `--secondary`. Axe in dark mode caught red error text failing on `--dark`.
4. **`sanity init` clobbers files** it does not own. Never run it here.
5. **A new Sanity project allows no browser origins.** The static site never calls Sanity from the browser, so only the Studio needs CORS: `pnpm scaffold` allows `http://localhost:3333` (local `sanity dev`) with credentials; Studios hosted on `*.sanity.studio` are allowed automatically. Never allow a wildcard origin with credentials.
6. **Running the scaffolder in the wrong directory** (a stale checkout) makes the push fail. The scaffolder checks for a common ancestor first.
7. **Strict CSP.** Astro hashes inline scripts and styles into a `<meta>` CSP; style attributes are not covered, hence no inline `style=`. Third-party libraries that emit inline styles (Shiki, the Portable Text underline mark) are replaced or avoided.
8. **Reduced motion in tests.** Axe sampling a mid-fade reveal reports a real but transient contrast failure. Axe tests emulate reduced motion.
9. **The Astro docs MCP URL** in `.mcp.json` could not be verified from the build environment (egress blocked). Confirm it on first use.
