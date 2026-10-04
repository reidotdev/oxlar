# Publishing

Editors publish in the hosted Studio. A Sanity webhook tells GitHub, GitHub rebuilds the static site and deploys it to Cloudflare Workers. Nothing is manual after the one-time setup below.

```
Studio (publish) -> Sanity webhook -> GitHub repository_dispatch "sanity-publish"
                 -> Actions: deploy.yml (install, typecheck, lint, build, wrangler deploy)
                 -> live site
```

Expected latency from clicking Publish to the change being live: **about 1.5 to 3 minutes** (webhook delivery in seconds, then `pnpm install` with a warm cache, `astro check`, lint, build and deploy). This is an estimate. Measure it on your first test publish and write the real figure here.

## One-time setup

### 1. Host the Studio

```bash
pnpm --filter oxlar-studio deploy      # sanity deploy: https://<studio-host>.sanity.studio
```

Set `SANITY_STUDIO_HOST` (see `studio/sanity.cli.ts`) for a stable hostname. Or host `studio/` as its own Cloudflare site: `pnpm --filter oxlar-studio build` outputs `studio/dist`.

Allow the Studio origin **with credentials** on the project, or logging in loops:

```bash
cd studio
pnpm exec sanity cors add https://<studio-host>.sanity.studio --credentials
```

Never allow a wildcard origin with credentials: any page on that domain could then make authenticated requests to the project.

### 2. GitHub token for the webhook

Create a fine-grained personal access token (or a GitHub App token) limited to this one repository with **Contents: Read and write**. `repository_dispatch` requires that permission. Store it only in the Sanity webhook configuration, never in the repo.

### 3. Create the webhook

In Sanity Manage, go to API, Webhooks, Create webhook.

| Field        | Value                                                                                                                  |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Name         | `Rebuild site`                                                                                                         |
| URL          | `https://api.github.com/repos/<owner>/<repo>/dispatches`                                                               |
| Dataset      | `production`                                                                                                           |
| Trigger on   | Create, Update, Delete                                                                                                 |
| Filter       | `_type in ["page", "post", "siteSettings"] && !(_id in path("drafts.**"))`                                             |
| Projection   | `{ "event_type": "sanity-publish", "client_payload": { "type": _type, "slug": slug.current } }`                        |
| HTTP method  | `POST`                                                                                                                 |
| HTTP headers | `Authorization: Bearer <token from step 2>`, `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28` |
| Drafts       | Off (published changes only)                                                                                           |
| Secret       | Optional. GitHub's dispatch endpoint does not verify Sanity signatures, so the bearer token is the credential.         |

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
| secret   | `CLOUDFLARE_API_TOKEN`  | Workers Scripts: Edit                            |
| secret   | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account id                            |

### 5. Test it

```bash
curl -X POST https://api.github.com/repos/<owner>/<repo>/dispatches \
  -H "Authorization: Bearer <token>" -H "Accept: application/vnd.github+json" \
  -d '{"event_type":"sanity-publish"}'
```

Then check the Actions tab for a `Deploy` run triggered by `repository_dispatch`, and publish a real edit in the Studio to test the whole chain.

## Alternative: Cloudflare Workers Builds

If the Worker is connected to the repository through Cloudflare Workers Builds, Cloudflare can create a deploy hook URL (Settings, Builds, Deploy hooks) that rebuilds on `POST`. Point the Sanity webhook at that URL (no GitHub token needed) and keep `deploy.yml` for pushes only. This path was not verified in this environment; confirm the deploy hook feature exists for your project before relying on it.

## Troubleshooting

- **Webhook returns 404 or 403**: the token lacks Contents write on this repo, or the repo path is wrong.
- **Workflow does not start**: `repository_dispatch` only fires workflows on the default branch. Make sure `deploy.yml` is on `main`.
- **Build fails after a publish**: the error names the document id (`[sanity] Document <id> failed validation`). Fix the content (missing alt text, slug, title) and publish again.
- **Site shows demo content**: `SANITY_PROJECT_ID` is not set in the repository variables.
- **Changes appear late**: Sanity's API CDN can serve a cached read for a few seconds after publish. A second run, or `useCdn: false`, removes this at the cost of speed.
