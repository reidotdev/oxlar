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

### What you need

- **Accounts (all have free plans):** GitHub, Cloudflare, Sanity.
- **On your machine:** Node 22.18 or newer, pnpm 10, and the GitHub CLI (`gh`), logged in.
- **A domain is optional.** Without one the site goes live on a free `https://<name>.<your-subdomain>.workers.dev` address: leave the production URL empty and the scaffold finds the address after the first deploy. With one, its DNS must be on Cloudflare in the same account; the scaffold attaches it to the site. You can add a domain later.
- **Once per Cloudflare account**, for automatic deploys: connect Cloudflare to GitHub and create one API token. The scaffold tells you when; `docs/publishing.md` has the steps.

### Create it

This is a **GitHub template repo**. Generate a new site from it (fresh history, its own `origin`), then run the setup. The first command creates a new private repo from the template and clones it:

```bash
gh repo create my-site --template reidotdev/oxlar --private --clone
cd my-site && pnpm install && pnpm scaffold
```

No `gh`? Use the green **"Use this template"** button on the repo page, clone the result, then `pnpm install && pnpm scaffold`. The scaffolder detects the template's existing `origin` and skips repo creation.

`pnpm scaffold` is an interview: project name, URL, Sanity (create a project, use an existing id, or later), GitHub, optional modules (React islands, three.js, draft preview), Cloudflare Workers (with your own domain if you have one), deploy on push and on Publish. It runs `pnpm install`, `pnpm sanity:types`, a first build and the template invariants, then prints a to-do list with the exact commands for anything it could not do. Every remote step asks first; a missing CLI or a failed command is reported, never fatal. Re-running is safe.

### The recommended answers

This is the most common path: a new site with a new Sanity project, deployed on Cloudflare, rebuilt automatically on every push and every Publish. Before you start, have your Cloudflare scaffold token ready, and if the Cloudflare GitHub app is set to selected repositories, add the new repository to it (see "What you need").

| Question                                                                    | Answer                                        | Why                                                                                                                         |
| --------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Project name                                                                | your site's name, e.g. `my-site`              | It names the Worker, the package and the Sanity project.                                                                    |
| One-line description                                                        | Enter                                         | It is only a placeholder; you write the real copy later.                                                                    |
| Production URL                                                              | your domain, e.g. `www.example.com`, or Enter | With a domain the site goes live there; without one it gets a free `*.workers.dev` address that the scaffold finds for you. |
| Push to origin?                                                             | `y`                                           | It puts the first commit on GitHub, which Cloudflare builds from.                                                           |
| Sanity: 1) create 2) existing 3) later                                      | `1`                                           | A new site gets its own content project, and the scaffold wires it up completely.                                           |
| Dataset                                                                     | Enter                                         | `production` is the standard name, and nothing else needs to change for it.                                                 |
| Organization id or slug                                                     | Enter                                         | Leave it blank unless you want the project in a Sanity organization.                                                        |
| Create a viewer read token?                                                 | `n`                                           | The dataset is public, so the build reads it without a token.                                                               |
| Deploy the Studio to Sanity hosting?                                        | `y`                                           | It gives editors a Studio at `<name>.sanity.studio` to publish from.                                                        |
| Studio hostname                                                             | Enter                                         | The default is your project name; pick another if Sanity says it is taken.                                                  |
| three.js: 3D / WebGL — Add it?                                              | `n`                                           | Add it only if the site needs 3D, as it is heavy.                                                                           |
| React islands — Add it?                                                     | `n`                                           | Native HTML covers the usual widgets; add it only for a complex one like a date picker.                                     |
| Draft preview build — Add it?                                               | `n`                                           | It is a separate preview site that needs extra setup; add it later if editors ask for it.                                   |
| Attach `<your domain>` to the Worker?                                       | `y`                                           | It points your domain at the site (the domain's DNS must be on Cloudflare). Not asked without a domain.                     |
| Build and deploy to Cloudflare Workers now?                                 | `y`                                           | It creates the Worker and puts the site live.                                                                               |
| Deploy on push and on Publish: 1) Workers Builds 2) GitHub Actions 3) later | `1`                                           | Cloudflare then rebuilds on every push and every Publish, with no tokens stored anywhere.                                   |
| Commit these and push?                                                      | `y`                                           | Cloudflare builds from GitHub, so it needs the scaffold's changes there.                                                    |
| Cloudflare API token                                                        | paste it, then Enter                          | It is used for this run only, to connect the builds, and is never stored.                                                   |
| Start a first build now?                                                    | `y`                                           | It proves the automatic build works before you rely on it.                                                                  |

A run that ends with every line ticked in **Results** is done. To check it: open the site, then publish something in the Studio and watch a new build appear under your Worker in the Cloudflare dashboard. If a step lands in **Still to do**, follow the command it prints; `node scripts/scaffold.ts --deploy-only` re-runs just the deploy setup.

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
