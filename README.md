# oxlar

A lean, near-zero-JS website template for content-driven showcase, portfolio and blog sites.

- **Astro 6**, fully static output, TypeScript strict
- **Vanilla CSS** with design tokens as custom properties (light and dark from one mapping)
- **Zero-JS components** on native HTML; small vanilla islands where the platform needs help
- **GSAP**, loaded lazily and only on pages that animate
- **Sanity** for all content, Studio hosted separately
- **Cloudflare Workers** static assets (host-agnostic output)
- Accessibility, performance and template invariants enforced in CI

A page with no animation and no widget ships **0 KB of JavaScript**. See `docs/comparison.md` for measured numbers against BMT-214A, the Next.js template for app-like projects.

## Start a project

Use this repository as a GitHub template, clone it, then:

```bash
pnpm install
pnpm scaffold          # interview: name, URL, Sanity, GitHub, modules, hosting
```

No terminal to answer prompts (phone, web session, CI)? Copy `scaffold.config.example.json` to `scaffold.config.json`, fill it in and run `node scripts/scaffold.ts --config scaffold.config.json --non-interactive`. See `.claude/skills/scaffold-headless.md`.

The site builds and runs with no credentials: without `SANITY_PROJECT_ID` it renders demo content.

## Everyday commands

```bash
pnpm dev                 # http://localhost:4321
pnpm build               # needs PUBLIC_SITE_URL
pnpm typecheck && pnpm lint && pnpm verify:template
pnpm test                # Playwright: keyboard, axe (light + dark), no-JS, motion, SEO, vitals
pnpm perf:size           # JS and CSS per route, budgets
pnpm perf                # Lighthouse mobile budgets (set CHROME_PATH)
pnpm sanity:types        # after editing a schema or a query
pnpm --filter oxlar-studio dev
```

`/styleguide` shows every component, variant and state (noindex, excluded from the sitemap; set `PUBLIC_STYLEGUIDE=false` to leave it out of production).

## Documentation

| File                          | Contents                                                                    |
| ----------------------------- | --------------------------------------------------------------------------- |
| `AGENTS.md`                   | The manual for humans and agents: stack, rules, commands, how to add things |
| `docs/architecture.md`        | Rendering, tokens, motion, budgets with measured numbers, licences          |
| `docs/publishing.md`          | Sanity webhook to GitHub to Cloudflare, step by step                        |
| `docs/deployment.md`          | Workers config, headers, CSP, redirects, EU alternatives                    |
| `docs/design.md`              | Per-project design decisions (filled in by the design-discovery skill)      |
| `docs/comparison.md`          | Lighthouse, JS and CSS bytes and build time vs BMT-214A                     |
| `docs/migration-inventory.md` | What BMT-214A contained and how each piece was ported                       |

## GitHub Actions: secrets and variables

Create an environment named `production` and set:

| Kind     | Name                                      | Used by                             |
| -------- | ----------------------------------------- | ----------------------------------- |
| variable | `PUBLIC_SITE_URL`                         | build (canonical URLs, sitemap, OG) |
| variable | `SANITY_PROJECT_ID`, `SANITY_DATASET`     | build                               |
| variable | `SANITY_API_VERSION`, `PUBLIC_STYLEGUIDE` | build (optional)                    |
| secret   | `SANITY_READ_TOKEN`                       | build, private datasets only        |
| secret   | `CLOUDFLARE_API_TOKEN`                    | deploy (Workers Scripts: Edit)      |
| secret   | `CLOUDFLARE_ACCOUNT_ID`                   | deploy                              |

`ci.yml` runs on every pull request (invariants, typecheck, lint, build, bundle budgets, Playwright, Lighthouse). `deploy.yml` runs on push to `main`, on `repository_dispatch` type `sanity-publish`, and manually. No secret is committed; `.env.example` holds placeholders only.

## Licences

MIT for this template. Inter is SIL OFL 1.1 (`public/fonts/OFL.txt`). GSAP is used under the GSAP Standard "no charge" licence (see `docs/architecture.md`).
