# Architecture

## Rendering

---

Fully static. `astro build` renders every route to HTML at build time (`output: 'static'`, no adapter, no SSR). Content comes from Sanity at build time, so a content change is a rebuild (see `docs/publishing.md`). Nothing in `src/` depends on Cloudflare APIs; `dist/` runs on any static host.

Without `SANITY_PROJECT_ID` the data layer answers from `src/lib/sanity/fixtures.ts`, so a fresh clone builds, tests and deploys with no credentials.

`PUBLIC_SITE_URL` is required for production builds (`astro.config.mjs` throws without it) and feeds canonical URLs, the sitemap, OG tags and `robots.txt`.

## JavaScript

---

There are exactly two places client JS may live:

- `src/islands/`: small vanilla scripts (dialog, menu, tabs web component, tooltip, field validation, background video). A component pulls its island in with `<script>import "../islands/x.ts"</script>`; Astro bundles and ships it only on pages that render the component.
- `src/motion/`: the GSAP registry (below).

One inline script exists, in `BaseLayout`: `document.documentElement.classList.add("js")`. It lets CSS set motion's hidden states before first paint. `verify:template` rejects any other inline script or logic in an `.astro` `<script>`.

### Measured budget (this build, gzipped)

| Page type                                             | Initial JS | Lazy JS                             |
| ----------------------------------------------------- | ---------- | ----------------------------------- |
| No `data-motion`, no island (about, blog, posts, 404) | **0.0 KB** | 0                                   |
| Animated (home: registry only)                        | 1.3 KB     | 58.7 KB (GSAP core + ScrollTrigger) |
| `/styleguide` (every island)                          | 4.0 KB     | 58.7 KB                             |

Budgets enforced by `scripts/check-bundle-size.ts`: 0 KB on plain pages; under 50 KB gzipped initial on animated pages (lazy GSAP counts toward the lazy figure). Per-route numbers are in `perf-report/bundle.json` after a run and in `docs/comparison.md`.

## Styling

---

All design decisions are custom properties in `src/styles/tokens.css`. Cascade order is declared once: `@layer reset, tokens, base, components, utilities;` in `global.css`. Component `<style>` blocks wrap their rules in `@layer components` so utilities can always override them.

Light and dark are **one mapping** built on `light-dark()` plus `color-scheme`: the OS preference works by default, `<html data-theme="dark|light">` forces a page theme and `data-surface="dark|light"` scopes a section. This replaces BMT-214A's three duplicated mappings.

### Token mapping from BMT-214A

Names are ported unchanged where possible, so `docs/design.md` stays valid.

| BMT-214A (Tailwind `@theme inline`)                                                                                                                                      | oxlar                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Palette: `--paper`, `--ink`, `--ink-muted`, `--line`, `--surface(-strong)`, `--dark*`, `--on-dark(-muted)`, `--brand(-on/-light)`, `--danger`, `--on-danger`, `--radius` | same names and values                                                                                                                                                                             |
| Semantic: `--background`, `--foreground`, `--card*`, `--primary*`, `--secondary*`, `--muted*`, `--accent*`, `--destructive*`, `--border`, `--input`, `--ring`            | same names; values use `light-dark()`                                                                                                                                                             |
| `--color-X: var(--X)` utilities (`bg-primary`)                                                                                                                           | plain `var(--primary)` in CSS                                                                                                                                                                     |
| `bg-primary/90` opacity shorthand                                                                                                                                        | `color-mix(in oklch, var(--primary) 90%, transparent)`                                                                                                                                            |
| `--font-sans: var(--font-inter), ...`                                                                                                                                    | `--font-sans: "Inter Variable", "Inter Fallback", ...`                                                                                                                                            |
| `--radius-sm/md/lg/xl` as `calc(var(--radius) ± 4px / 2px)`                                                                                                              | same, in rem                                                                                                                                                                                      |
| (none)                                                                                                                                                                   | added: `--danger-light` and `--destructive-text` (red as text on dark), `--overlay`, fluid type scale `--text-*`, `--space-*`, `--shadow-*`, `--z-*`, `--duration-*`, `--ease-*`, `--container-*` |

Rules, enforced by Stylelint (`stylelint.config.mjs`) and `verify:template`: no colour literals anywhere but `tokens.css` (and `src/lib/brand-colors.ts`, which mirrors two values for meta tags, the manifest and Satori), and no px for spacing or type outside `tokens.css`. Exceptions need a `stylelint-disable-next-line` comment with a reason.

## Motion

---

`src/motion/loader.ts` dynamically imports `gsap` once and registers plugins once on request. `index.ts` is the registry: it scans for `data-motion="<pattern>"`, dynamically imports the matching module and runs `init(root)`, which returns a cleanup function. Modules: `reveal` (a port of BMT-214A's `<Reveal>`: opacity 0 and y 24, 0.8 s, `power3.out`, `top 85%`, once), `parallax`, `split-text`.

- A page ships the registry only if it renders `<Reveal>` or `<Motion />`; otherwise no motion code is requested at all. `check-bundle-size.ts` fails a page with `data-motion` and no registry, and the reverse.
- Elements near the viewport load after idle; the rest on an `IntersectionObserver` with a 200 px margin.
- Hidden states are CSS under `html.js` and `prefers-reduced-motion: no-preference`. The registry lifts them (`data-motion-ready`) in the same task it creates the tween, so there is no flash. Two failsafes keep content from staying hidden: the registry reveals everything if a module fails to load, and a 3 s CSS animation reveals everything if the registry itself never runs. Both are tested.
- Reduced motion uses `gsap.matchMedia()`: no tween is created and nothing starts hidden.
- Animate `transform` and `opacity` only; the LCP element is never a motion element.
- The registry listens for `astro:before-swap` and `astro:page-load`, so adding `<ClientRouter />` later works. There is no client router by default; cross-document View Transitions are on as progressive enhancement (`@view-transition` in `base.css`).

### GSAP licence

The `gsap` 3.15.0 package declares its licence as the **GSAP Standard "no charge" licence** (https://gsap.com/standard-license). Core and every plugin used here (ScrollTrigger, SplitText, Flip) ship in that single package. This was read from the package metadata; the licence page itself could not be fetched from the build environment. Read the current terms before shipping to a client, in particular any restrictions on use in tools that compete with Webflow.

## Content (Sanity)

---

- Studio: `studio/` package (nested, included in the pnpm workspace so one `pnpm install` and one lockfile cover both). It is the only place React exists in the base repo.
- Schema: `page` ported unchanged (additive `seo` and richer `body`); new `post`, `siteSettings` singleton and shared objects (`seo`, `imageWithAlt`, `callout`, `codeBlock`).
- Data layer (`src/lib/sanity/`): `client.ts` (`sanityFetch` with per-build request de-duplication, env guards, fixtures fallback), `queries.ts` (all GROQ), `sanity.types.ts` (generated and committed; `verify:template` regenerates and fails on a diff), `image.ts`, `validate.ts`.
- Images: `SanityImage.astro` renders `srcset` with `auto=format`, quality, hotspot and crop, and explicit width and height from the asset (cropped dimensions). LQIP is not painted (CSP forbids the style attribute it needs).
- Portable Text: `astro-portabletext` with components for images, callouts and code. Unknown block types throw and fail the build.
- Validation: missing title, slug or image alt fails the build naming the document id; reserved slugs collide loudly. SEO title and description are optional because pre-existing `page` documents have no `seo` field; they fall back to title and excerpt.

## SEO

---

`buildSeo()` produces title, description, canonical, Open Graph, Twitter card and JSON-LD (`WebSite`, `Person` or `Organization` from site settings, `BlogPosting`, `CreativeWork`, `BreadcrumbList`). `@astrojs/sitemap` excludes `/styleguide`; `robots.txt` and `rss.xml` are endpoints; OG images are built per page and post with Satori and Resvg from fonts in `public/fonts` (Satori reads WOFF, not WOFF2, so two static WOFF weights sit beside the variable WOFF2). No analytics.

## Security headers and CSP

---

Astro's `security.csp` emits a `<meta>` CSP with a hash for every inline script and style, plus the directives set in `astro.config.mjs`; `public/_headers` adds `frame-ancestors` and the other headers a meta tag cannot carry. The CSP forbids style attributes, which shaped three decisions (no LQIP paint, no library inline styles, a custom Portable Text underline mark). Details in `docs/deployment.md`.

## Testing

---

Playwright runs against `astro preview` of the production build, Chromium only:

- `a11y.spec.ts`: computed focus ring on really focused elements, focus order and skip link, axe (WCAG 2.2 AA) on every route in light and dark, the 404 page, open menu and dialog.
- `components.spec.ts`: form validation messages and `aria-describedby`, dialog (modal, Escape, backdrop, focus return), menu keyboard, tabs keyboard, accordion, tooltip Escape.
- `nojs.spec.ts`: key pages readable and navigable with JS off; tabs degrade to labelled panels.
- `motion.spec.ts`: 0 script requests on plain pages, `html.js` before paint, hidden-state failsafe, reduced motion, failed-module recovery.
- `seo.spec.ts`: sitemap, robots, RSS, OG PNG dimensions, JSON-LD, canonical, noindex, strict CSP with no violations.
- `performance.spec.ts`: LCP under 2.0 s, CLS under 0.05, interaction latency under 150 ms, no third-party requests, image dimensions, font preload.

`pnpm perf` adds Lighthouse (mobile, simulated throttling): Performance 95+, Accessibility, Best Practices and SEO 100, LCP under 2.0 s, CLS under 0.05. Measured on the home page and a post: 100 / 100 / 100 / 100, LCP 1.4 s, CLS 0, TBT 0 ms.

## Known limits

---

- Tested in Chromium only. Safari and Firefox behaviour (Popover API, anchor positioning fallback, `<details name>`, view transitions) is unverified.
- INP is approximated with the Event Timing API in a lab run; there is no field data.
- Lighthouse numbers come from a single run in a shared container.
- The Astro docs MCP URL could not be verified from the build environment (network egress was restricted). The Workers Builds setup in the scaffold was tested against mocked APIs first.

## Dependencies beyond the spec's list

---

The spec says to add nothing outside section 4 without asking. These were needed and are the smallest option; flag any you disagree with.

| Package              | Where          | Why                                                                                             |
| -------------------- | -------------- | ----------------------------------------------------------------------------------------------- |
| `groq`               | root, dev      | The official `groq` tag and `defineQuery`. Sanity typegen finds queries through it              |
| `postcss-html`       | root, dev      | Lets Stylelint parse `<style>` blocks in `.astro` files (the token rules cannot run without it) |
| `lighthouse`         | root, dev      | The spec's Lighthouse budget gate (`pnpm perf`) has no other source                             |
| `styled-components`  | `studio/` only | Required peer of `sanity` 6; `sanity build` fails without it. Never reaches the web package     |
| `react`, `react-dom` | `studio/` only | Required by the Studio. The web package has none                                                |

`eslint` is on 10.x (not 9): `eslint-plugin-astro` 3.2.1 declares a peer of `eslint >= 10`, and lint passes on it. BMT-214A's pin to 9.x existed because of `eslint-config-next` and does not apply here. The React Aria MCP from BMT-214A's `.mcp.json` was dropped because the base template has no React Aria; the `react-islands` module doc suggests adding it back.

## Decisions on the spec's open questions

---

| Question                                             | Decision                                                                                                                                                                         |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nested `studio/` or workspace                        | Nested package, listed in `pnpm-workspace.yaml` so one install and one lockfile serve both. Not an `apps/*` split                                                                |
| Preview mode and Visual Editing in the first release | Draft preview build shipped as an opt-in module (`PREVIEW=true`, noindex, separate Worker config), untested against a live dataset. Visual Editing not included                  |
| React Aria widgets too complex to rebuild natively   | `Select` (custom popover listbox) became a native `<select>`; everything else was rebuilt natively. A rich listbox, combobox or date picker would use the `react-islands` module |
| Scaffold default if Cloudflare is not acceptable     | Cloudflare is the only hosting the scaffold sets up. The output is plain static files, so another host only needs a different deploy step                                        |
