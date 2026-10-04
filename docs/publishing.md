# Publishing

Editors publish in the hosted Studio. A Sanity webhook tells GitHub, GitHub rebuilds the static site and deploys it to Cloudflare Workers. Nothing is manual after the one-time setup below.

```
Studio (publish) -> Sanity webhook -> GitHub repository_dispatch "sanity-publish"
                 -> Actions: deploy.yml (install, typecheck, lint, build, wrangler deploy)
                 -> live site
```

Latency from clicking Publish to the change being live: **about 1 minute in our test, plus queue time**. In an end-to-end test (publish in the hosted Studio, webhook, `repository_dispatch`, `deploy.yml`, live site) the deploy job ran for 1m6s to 1m9s. Webhook delivery takes seconds; add however long GitHub takes to pick up the job.

## One-time setup

### 1. Host the Studio

```bash
pnpm --filter oxlar-studio deploy
```

This runs `sanity deploy` and publishes the Studio at `https://<studio-host>.sanity.studio`. Set `SANITY_STUDIO_HOST` (see `studio/sanity.cli.ts`) for a stable hostname. Or host `studio/` as its own Cloudflare site: `pnpm --filter oxlar-studio build` outputs `studio/dist`.

Allow the Studio origin **with credentials** on the project, or logging in loops:

```bash
cd studio
pnpm exec sanity cors add https://<studio-host>.sanity.studio --credentials
```

Never allow a wildcard origin with credentials: any page on that domain could then make authenticated requests to the project.

### 2. GitHub token for the webhook

Create a fine-grained personal access token (or a GitHub App token) limited to this one repository with **Contents: Read and write**. `repository_dispatch` requires that permission. Store it only in the Sanity webhook configuration, never in the repo.

A fine-grained token expires. When it does, publishing keeps working in the Studio but **silently stops deploying**: nothing fails where an editor would see it. Write the expiry date down where you will see it (a calendar reminder works), and renew the token before then. The webhook's delivery log in Sanity Manage (API, Webhooks, the webhook, attempts) shows a `401` from GitHub once the token has expired; replace the token in the Authorization header to fix it.

### 3. Create the webhook

In Sanity Manage, go to API, Webhooks, Create webhook.

| Field        | Value                                                                                                          |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| Name         | `Rebuild site`                                                                                                 |
| URL          | `https://api.github.com/repos/<owner>/<repo>/dispatches`                                                       |
| Dataset      | `production`                                                                                                   |
| Trigger on   | Create, Update, Delete                                                                                         |
| Filter       | `_type in ["page", "post", "siteSettings"] && !(_id in path("drafts.**"))`                                     |
| Projection   | `{ "event_type": "sanity-publish", "client_payload": { "type": _type, "slug": slug.current } }`                |
| HTTP method  | `POST`                                                                                                         |
| HTTP headers | Three rows, see below                                                                                          |
| Drafts       | Off (published changes only)                                                                                   |
| Secret       | Optional. GitHub's dispatch endpoint does not verify Sanity signatures, so the bearer token is the credential. |

The form takes HTTP headers one row per header, with a Name and a Value column; a new empty row appears as you type in the last one. Add three rows:

| Name                   | Value                         |
| ---------------------- | ----------------------------- |
| `Authorization`        | `Bearer <token from step 2>`  |
| `Accept`               | `application/vnd.github+json` |
| `X-GitHub-Api-Version` | `2022-11-28`                  |

The Authorization value is the word `Bearer`, one space, then the token, with no quotes. Without the `Bearer ` prefix GitHub answers `401`.

The filter keeps drafts out. The projection produces the body GitHub expects (`event_type` plus a small `client_payload` including `_type` and `slug`). The workflow does not use the payload yet; it is there so a future incremental build can.

If you add a document type that renders pages, add it to the filter's `_type in [...]` list.

### 4. GitHub secrets and variables

Repository settings, Secrets and variables, Actions. Use **repository-level** variables and secrets (not an environment): the deploy job is skipped until the `PUBLIC_SITE_URL` variable exists, and a job-level condition cannot see environment-scoped variables.

| Kind     | Name                    | Purpose                                          |
| -------- | ----------------------- | ------------------------------------------------ |
| variable | `PUBLIC_SITE_URL`       | Canonical production URL (no trailing slash)     |
| variable | `SANITY_PROJECT_ID`     | Sanity project id                                |
| variable | `SANITY_DATASET`        | Usually `production`                             |
| variable | `SANITY_API_VERSION`    | Optional, defaults to the version in `client.ts` |
| variable | `PUBLIC_STYLEGUIDE`     | `false` to leave `/styleguide` out of production |
| secret   | `SANITY_READ_TOKEN`     | Only for a private dataset                       |
| secret   | `CLOUDFLARE_API_TOKEN`  | "Edit Cloudflare Workers" token template         |
| secret   | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account id                            |

The Cloudflare API token can come straight from the **Edit Cloudflare Workers** template in the Cloudflare dashboard (My Profile, API Tokens, Create Token). In our test that one token deployed both the Worker and its custom domain, set as a route in `wrangler.jsonc` (`"routes": [{ "pattern": "<your-domain>", "custom_domain": true }]`). No extra zone or DNS permission was needed.

Setting them with the GitHub CLI works. Variables are not secret, so `--body` is fine for them:

```bash
gh variable set PUBLIC_SITE_URL --body https://<your-domain>
gh variable set SANITY_PROJECT_ID --body <project-id>
gh variable set SANITY_DATASET --body production
```

For secrets, run the command without a value and paste the value at the prompt:

```bash
gh secret set CLOUDFLARE_API_TOKEN
gh secret set CLOUDFLARE_ACCOUNT_ID
```

Add `gh secret set SANITY_READ_TOKEN` the same way if the dataset is private.

Never pass a secret with `--body "<secret>"`: the value then lands in your shell history. If you need a non-interactive form, read the value from stdin, for example from the clipboard with `pbpaste | gh secret set CLOUDFLARE_API_TOKEN` on macOS, or from a file with `gh secret set CLOUDFLARE_API_TOKEN < token.txt` and then delete the file.

Type these commands rather than copying them from a chat or a web page. A copied line can carry invisible characters, which `gh` reads as an extra argument and rejects with `accepts at most 1 arg(s), received 2`.

### 5. Test it

Fire one dispatch by hand first. `read -rs` asks for the token without echoing it, so it stays out of your shell history:

```bash
read -rs GH_DISPATCH_TOKEN
curl -X POST https://api.github.com/repos/<owner>/<repo>/dispatches \
  -H "Authorization: Bearer $GH_DISPATCH_TOKEN" -H "Accept: application/vnd.github+json" \
  -d '{"event_type":"sanity-publish"}'
unset GH_DISPATCH_TOKEN
```

Then check the Actions tab for a `Deploy` run triggered by `repository_dispatch`, and publish a real edit in the Studio to test the whole chain.

## Alternative: Cloudflare Workers Builds

If the Worker is connected to the repository through Cloudflare Workers Builds, Cloudflare can create a deploy hook URL (Settings, Builds, Deploy hooks) that rebuilds on `POST`. Point the Sanity webhook at that URL (no GitHub token needed) and keep `deploy.yml` for pushes only. This path was not verified in this environment; confirm the deploy hook feature exists for your project before relying on it.

## Troubleshooting

- **Webhook returns 401**: the Authorization value is missing the `Bearer ` prefix, or the token has expired. Check the webhook's delivery log in Sanity Manage, then fix the header or replace the token.
- **Webhook returns 404 or 403**: the token lacks Contents write on this repo, or the repo path is wrong.
- **`gh` says `accepts at most 1 arg(s), received 2`**: the command line carries an extra argument, usually an invisible character from a copied line, or an inline `# comment` (zsh passes `#` through as an argument in an interactive shell). Type the command by hand.
- **Workflow does not start**: `repository_dispatch` only fires workflows on the default branch. Make sure `deploy.yml` is on `main`.
- **Build fails after a publish**: the error names the document id (`[sanity] Document <id> failed validation`). Fix the content (missing alt text, slug, title) and publish again.
- **Site shows demo content**: `SANITY_PROJECT_ID` is not set in the repository variables.
- **Changes appear late**: Sanity's API CDN can serve a cached read for a few seconds after publish. A second run, or `useCdn: false`, removes this at the cost of speed.
