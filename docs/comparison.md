# Comparison: BMT-214A vs oxlar

Measured 2026-10-04 in the build environment (Linux container, Chromium 141.0.7390.37 from `/opt/pw-browsers`, headless). Both sides use the template's own demo content: **neither side is a real production site**, and Sanity is unconfigured on both (BMT-214A shows its "not configured" card, oxlar shows the bundled demo content). Treat the numbers as a like-for-like template comparison, not a client benchmark. The comparison gate in the spec asks for a real site or the template demo; this is the template demo, and a real-site run is still open.

BMT-214A was built from a clean copy of `339fd5b` (`pnpm install --frozen-lockfile`, `next build`, `next start`). Nothing in the BMT-214A repository was modified.

## Method

---

- **Lighthouse 13.5.0**, mobile form factor, simulated throttling (Lighthouse defaults), one run per page, same machine, same Chromium. One run per page is noisy: treat differences under about 10 percent as noise. The large gaps below are not.
- **JS and CSS bytes**: gzipped, from the delivered HTML, counting every script and stylesheet the page references (BMT-214A: `<script src>` and script preloads; oxlar: `scripts/check-bundle-size.ts`, which also follows static imports). "Lazy" is JS reachable only through dynamic `import()`.
- **Build time**: cold build, no cache, including package-manager startup.

## Results

---

### Like-for-like pages (every component demonstrated)

BMT-214A's home page embeds the React Aria `Showcase` (every component). oxlar's equivalent is `/styleguide`.

| Metric                         | BMT-214A `/`                                       | oxlar `/styleguide`                               | oxlar `/` (hero, posts, pages)    |
| ------------------------------ | -------------------------------------------------- | ------------------------------------------------- | --------------------------------- |
| JS, initial (gzipped)          | **303.4 KB** (11 script files, plus 2.6 KB inline) | **4.0 KB**                                        | **1.3 KB**                        |
| JS, lazy (gzipped)             | 0 KB reported by the framework                     | 58.7 KB (GSAP + ScrollTrigger, loaded after idle) | 58.7 KB                           |
| CSS (gzipped)                  | 6.7 KB                                             | 6.3 KB                                            | 3.5 KB                            |
| Lighthouse Performance         | 95                                                 | 100                                               | 100                               |
| Accessibility / Best Practices | 100 / 100                                          | 100 / 100                                         | 100 / 100                         |
| SEO                            | 100                                                | 66 (expected: the page is `noindex`)              | 100                               |
| LCP (simulated mobile)         | 2.5 s                                              | 1.4 s                                             | 1.4 s                             |
| FCP                            | 0.8 s                                              | 1.0 s                                             | 0.9 s                             |
| CLS                            | 0                                                  | 0                                                 | 0                                 |
| TBT                            | 180 ms                                             | 0 ms                                              | 0 ms                              |
| Script requests                | 10                                                 | 3                                                 | 5 (4 are the lazy GSAP chunks)    |
| Total transfer                 | 355 KiB                                            | 67 KiB                                            | 104 KiB (includes the 47 KB font) |

oxlar beats BMT-214A on **JS shipped** (about 75x less initial JS on the like-for-like page) and **LCP** (1.4 s vs 2.5 s), as the spec requires.

### oxlar per route

Gzipped, from `pnpm perf:size` (`html.js` inline script and JSON-LD excluded):

| Route                              | JS initial | JS lazy | CSS    | Motion |
| ---------------------------------- | ---------- | ------- | ------ | ------ |
| `/`                                | 1.3 KB     | 58.7 KB | 3.5 KB | yes    |
| `/404`                             | 0.0 KB     | 0.0 KB  | 3.1 KB | no     |
| `/about`                           | 0.0 KB     | 0.0 KB  | 3.2 KB | no     |
| `/blog`                            | 0.0 KB     | 0.0 KB  | 3.1 KB | no     |
| `/blog/motion-without-the-cost`    | 0.0 KB     | 0.0 KB  | 3.2 KB | no     |
| `/blog/zero-javascript-by-default` | 0.0 KB     | 0.0 KB  | 3.2 KB | no     |
| `/styleguide`                      | 4.0 KB     | 58.7 KB | 6.3 KB | yes    |

Every content route ships **0.0 KB of JS**.

### Build

|                       | BMT-214A                                           | oxlar                            |
| --------------------- | -------------------------------------------------- | -------------------------------- |
| Cold production build | 31.6 s (Turbopack compile 21.9 s, typecheck 5.8 s) | 5.7 s (7 pages and 5 OG PNGs)    |
| Output                | 9.8 MB `.next/static` plus a Node server           | 608 KB static `dist/` (40 files) |

## Regressions and trade-offs

---

None on the two gated metrics. Things that got worse or were given up, and why:

- **FCP 0.9 to 1.0 s vs 0.8 s** (within noise on a single run). Not investigated further.
- **`Select`** is a native `<select>`: it loses the custom popover list styling and typeahead chrome React Aria gave. The accessible behaviour is the browser's. If a rich listbox is required, use the opt-in React islands module.
- **Tabs** need JS to become a tablist. Without it the panels render stacked with their own headings (readable, not interactive). A small layout shift happens at upgrade time on the styleguide only.
- **Dialog and menu** rely on the Popover API and native `<dialog>`. Positioning uses CSS anchor positioning with a script fallback, which was tested only in Chromium.
- **LQIP placeholders are not painted**: they need an inline style, which the strict CSP forbids. The muted token background is the placeholder; `width`/`height` prevent layout shift.
- **Storybook is gone**, replaced by `/styleguide` (axe runs against it in light and dark). There are no isolated per-component docs or addon panels.
- **GSAP still costs 58.7 KB gzipped** when a page animates. It loads after idle or on approach, never in the initial script, and not at all on pages without `data-motion`. That is the budget the spec chose.
- **No live Sanity dataset was available**, so content parity with a real BMT-214A dataset was verified only by schema compatibility (the `page` fields are unchanged) and the demo fixtures, not against production content.

## Reproduce

---

```bash
# oxlar
pnpm install --frozen-lockfile && PUBLIC_SITE_URL=https://example.com pnpm build
pnpm perf:size
CHROME_PATH=/path/to/chrome pnpm perf          # Lighthouse, both gated pages
# BMT-214A
git clone https://github.com/reidotdev/BMT-214A && cd BMT-214A
pnpm install --frozen-lockfile && NEXT_PUBLIC_SITE_URL=http://localhost:3100 pnpm exec next build
pnpm exec next start -p 3100
pnpm exec lighthouse http://localhost:3100/ --form-factor=mobile --only-categories=performance,accessibility,best-practices,seo
```
