# Deployment

Default target: **Cloudflare Workers with static assets**. The build output (`dist/`) is plain static files and stays host-agnostic: nothing in `src/` depends on a Cloudflare API.

## Cloudflare Workers (default)

`wrangler.jsonc`:

```jsonc
{
  "name": "oxlar",
  "compatibility_date": "2026-10-01",
  "assets": {
    "directory": "./dist",
    "html_handling": "auto-trailing-slash",
    "not_found_handling": "404-page",
  },
}
```

- `html_handling: auto-trailing-slash` serves `/about/` from `about/index.html` and redirects as needed.
- `not_found_handling: "404-page"` serves `dist/404.html` with a 404 status for unknown paths.

### First deploy

```bash
pnpm exec wrangler login
PUBLIC_SITE_URL=https://example.com pnpm build
pnpm cf:deploy
```

`pnpm scaffold` can do this and prints the exact commands for what it skips. Rename the Worker in `wrangler.jsonc` (`name`) per project. When the production URL is on your own domain, `pnpm scaffold` offers to add it as a custom-domain route in `wrangler.jsonc` (`"routes": [{ "pattern": "<your-domain>", "custom_domain": true }]`), so every deploy keeps it; Cloudflare creates the DNS record and certificate. The domain's DNS must be on Cloudflare, in the same account. A site on `*.workers.dev` needs no route. To add more hostnames later (for example both `example.com` and `www.example.com`), add more entries to `routes`, or use the dashboard (Worker, Settings, Domains & Routes). For CI, an API token from the "Edit Cloudflare Workers" template deployed both the Worker and such a custom-domain route in our test, with no extra zone or DNS permission (see `docs/publishing.md`).

**Which account.** The Worker deploys to the account in `account_id` in `wrangler.jsonc`, else `CLOUDFLARE_ACCOUNT_ID`; wrangler checks them in that order. Without either, a login that reaches several accounts makes `wrangler deploy` prompt, which fails in a script ("More than one account available"), and an earlier interactive choice is cached locally (`node_modules/.cache/wrangler`) and reused silently. So `pnpm scaffold` settles the account first: it keeps an `account_id` already in the file, else takes `CLOUDFLARE_ACCOUNT_ID`, else lists the accounts of the current `wrangler login` (`wrangler whoami --json`, read-only), uses the only one or asks you to pick from a numbered list (`cloudflare.accountId` in a config file, headless). It writes the choice into `wrangler.jsonc` as `account_id`, which is not a secret and is committed with the scaffold's other changes. Headless with several accounts and no `cloudflare.accountId`, it deploys nothing and puts the choice on the to-do list. A dedicated account for a new site has to exist before the run: create it at dash.cloudflare.com/sign-up, or get invited to it, then re-run the scaffold. Account creation has no API.

**A new account's workers.dev subdomain.** A Worker without routes deploys to `<worker>.<subdomain>.workers.dev`, and a new account has no subdomain yet. On a first deploy wrangler then asks to register one, which needs a terminal: in a script (stdin closed) the question answers no and the deploy fails with "register a workers.dev subdomain here". (When wrangler detects a coding agent, such as Claude Code, it registers the Worker name without asking.) `pnpm scaffold` recognises that failure, asks for the subdomain (default: the Worker name, as wrangler suggests; `cloudflare.workersDevSubdomain` headless), registers it once for the account with wrangler's own login (`wrangler auth token`, the same `PUT /accounts/<id>/workers/subdomain` wrangler calls) and deploys again. Headless without the key, it defers with the dashboard link `https://dash.cloudflare.com/<account-id>/workers/subdomain`. DNS for a new subdomain can take a few minutes. A site with a custom-domain route never needs it.

### Deploys after the first

By default Cloudflare Workers Builds deploys on every push to `main`, and a deploy hook called by the Sanity webhook deploys on every Publish. `pnpm scaffold` (or `node scripts/scaffold.ts --deploy-only`) sets both up. The alternative is `.github/workflows/deploy.yml`, which runs on push to `main`, on `repository_dispatch` (`sanity-publish`) and manually, once the repository has the `PUBLIC_SITE_URL` variable. Use one or the other. `docs/publishing.md` compares them and lists the tokens and variables.

## Headers: `public/_headers`

Workers static assets read `_headers` from the build output.

| Header                                    | Value                                                                                                                                             | Why                                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `Content-Security-Policy` (HTML `<meta>`) | `default-src 'self'`, hashed `script-src` and `style-src`, `img-src 'self' https://cdn.sanity.io`, `object-src 'none'`, `base-uri`, `form-action` | Generated by Astro at build time (`security.csp`) because the inline script and style hashes change per build |
| `Content-Security-Policy` (header)        | `frame-ancestors 'none'`                                                                                                                          | A meta tag cannot express `frame-ancestors`                                                                   |
| `X-Content-Type-Options`                  | `nosniff`                                                                                                                                         |                                                                                                               |
| `Referrer-Policy`                         | `strict-origin-when-cross-origin`                                                                                                                 |                                                                                                               |
| `Permissions-Policy`                      | camera, microphone, geolocation, interest-cohort all off                                                                                          |                                                                                                               |
| `Cross-Origin-Opener-Policy`              | `same-origin`                                                                                                                                     |                                                                                                               |
| `Cache-Control` for HTML                  | `public, max-age=0, must-revalidate`                                                                                                              | Fresh after each deploy                                                                                       |
| `Cache-Control` for `/_astro/*`           | `public, max-age=31536000, immutable`                                                                                                             | Content-hashed filenames                                                                                      |
| `Cache-Control` for `/fonts/*`            | `public, max-age=604800`                                                                                                                          | Stable filenames, so one week                                                                                 |

CSP notes:

- There are **no inline style attributes**, because hashes do not cover them. This is why `SanityImage` does not paint LQIP placeholders and why the Portable Text underline mark is replaced. Setting a CSSOM property from script (GSAP, the menu fallback) is allowed.
- Media in `<video>` may come from any https host (`media-src 'self' https:`). Tighten it to your CDN per project.
- If you add a third-party origin (an embed, a font), add it to `security.csp.directives` in `astro.config.mjs`, and think twice: the template ships no third-party requests on purpose.

## Redirects: `public/_redirects`

One rule per line: `from to status`, for example `/old-path /new-path 301`. Cloudflare reads this file from the build output. Keep the list short; large redirect maps belong in the Worker config.
