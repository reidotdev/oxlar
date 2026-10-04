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

This is a **GitHub template repo**. Generate a new site from it (fresh history, its own `origin`), then run the setup. The first command creates a new private repo from the template and clones it:

```bash
gh repo create my-site --template reidotdev/oxlar --private --clone
cd my-site && pnpm install && pnpm scaffold
```

No `gh`? Use the green **"Use this template"** button on the repo page, clone the result, then `pnpm install && pnpm scaffold`. The scaffolder detects the template's existing `origin` and skips repo creation.

`pnpm scaffold` is an interview: project name, URL, Sanity (create a project, use an existing id, or later), GitHub, optional modules (React islands, three.js, draft preview), hosting (Cloudflare Workers, or statichost.eu). It runs `pnpm install`, `pnpm sanity:types`, a first build and the template invariants, then prints a to-do list with the exact commands for anything it could not do. Every remote step asks first; a missing CLI or a failed command is reported, never fatal. Re-running is safe.

No terminal to answer prompts (phone, web session, CI)? Copy `scaffold.config.example.json` to `scaffold.config.json`, fill it in and run `node scripts/scaffold.ts --config scaffold.config.json --non-interactive`. See `.claude/skills/scaffold-headless.md`. After setup, run the `design-discovery` skill to fill `docs/design.md`.

The site builds and runs with no credentials: without `SANITY_PROJECT_ID` it renders demo content.

## Everyday commands

| Command                                               | What it does                                                           |
| ----------------------------------------------------- | ---------------------------------------------------------------------- |
| `pnpm dev`                                            | Dev server at http://localhost:4321                                    |
| `pnpm build`                                          | Production build (needs `PUBLIC_SITE_URL`)                             |
| `pnpm typecheck && pnpm lint && pnpm verify:template` | The static checks                                                      |
| `pnpm test`                                           | Playwright: keyboard, axe (light and dark), no-JS, motion, SEO, vitals |
| `pnpm perf:size`                                      | JS and CSS per route, against the budgets                              |
| `pnpm perf`                                           | Lighthouse mobile budgets (set `CHROME_PATH`)                          |
| `pnpm sanity:types`                                   | After editing a schema or a query                                      |
| `pnpm --filter oxlar-studio dev`                      | The Studio, locally                                                    |

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

## Deploying: Workers Builds or GitHub Actions

By default Cloudflare Workers Builds deploys on push, and a Sanity webhook calls its deploy hook on Publish. The scaffold sets it up (`node scripts/scaffold.ts --deploy-only` for an existing project) and nothing goes into GitHub. It needs a one-time setup per Cloudflare account, described in `docs/publishing.md`.

The alternative is `deploy.yml` on GitHub Actions. It needs these **repository** variables and secrets (Settings, Secrets and variables, Actions), and the deploy job is skipped until `PUBLIC_SITE_URL` exists, so leave that unset on a Workers Builds site:

| Kind     | Name                                      | Used by                             |
| -------- | ----------------------------------------- | ----------------------------------- |
| variable | `PUBLIC_SITE_URL`                         | build (canonical URLs, sitemap, OG) |
| variable | `SANITY_PROJECT_ID`, `SANITY_DATASET`     | build                               |
| variable | `SANITY_API_VERSION`, `PUBLIC_STYLEGUIDE` | build (optional)                    |
| secret   | `SANITY_READ_TOKEN`                       | build, private datasets only        |
| secret   | `CLOUDFLARE_API_TOKEN`                    | deploy ("Edit Cloudflare Workers")  |
| secret   | `CLOUDFLARE_ACCOUNT_ID`                   | deploy                              |

Set secrets with `gh secret set NAME` and paste the value at the prompt; never `--body "<secret>"`, which leaves the value in your shell history. `docs/publishing.md` has the commands, the token permissions and the webhook setup.

`ci.yml` runs on every pull request (invariants, typecheck, lint, build, bundle budgets, Playwright, Lighthouse). `deploy.yml` runs on push to `main`, on `repository_dispatch` type `sanity-publish`, and manually. No secret is committed; `.env.example` holds placeholders only.

## Licences

MIT for this template. Inter is SIL OFL 1.1 (`public/fonts/OFL.txt`). GSAP is used under the GSAP Standard "no charge" licence (see `docs/architecture.md`).
