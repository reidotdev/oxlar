# Publishing

Editors publish in the hosted Studio. A Sanity webhook starts a rebuild of the static site, which then deploys to Cloudflare Workers. Nothing is manual after the one-time setup.

There are two ways to wire it. `pnpm scaffold` sets up either (on a project that is already set up: `node scripts/scaffold.ts --deploy-only`):

|                        | Cloudflare Workers Builds (default)                 | GitHub Actions (`deploy.yml`)                               |
| ---------------------- | --------------------------------------------------- | ----------------------------------------------------------- |
| Who builds             | Cloudflare, from the GitHub repo                    | GitHub Actions                                              |
| On Publish             | The Sanity webhook calls a Cloudflare deploy hook   | The Sanity webhook calls GitHub `repository_dispatch`       |
| Tokens per site        | None: the hook URL is the credential                | A GitHub token for Sanity, two Cloudflare secrets in GitHub |
| A token that expires   | None                                                | The GitHub token (publishing then silently stops deploying) |
| Set up by the scaffold | All of it, after a one-time step per account        | Variables and the webhook; you paste the tokens             |
| Checks before deploy   | The build command runs them; `ci.yml` runs as usual | Same job                                                    |

Use one route per site; both at once deploy twice. `deploy.yml` deploys whenever the repository has the `PUBLIC_SITE_URL` variable, so the Workers Builds route leaves it unset (the scaffold offers to delete it).

Latency from clicking Publish to the change being live, measured on the GitHub Actions route: **about 1 minute, plus queue time** (the deploy job ran 1m6s to 1m9s). Webhook delivery takes seconds. A Workers Build runs the same checks and build; its time is shown per build in the Worker's build history.

## Host the Studio

```bash
pnpm --filter oxlar-studio run deploy
```

This runs `sanity deploy` and publishes the Studio at `https://<studio-host>.sanity.studio`. Set `SANITY_STUDIO_HOST` (see `studio/sanity.cli.ts`) for a stable hostname. Or host `studio/` as its own Cloudflare site: `pnpm --filter oxlar-studio build` outputs `studio/dist`.

The first deploy registers the Studio as an application and prints `Add appId: '<id>'`. Put it in `studio/sanity.cli.ts` as `deployment: { appId: "<id>" }` and commit it, or every later deploy asks for it again. When `pnpm scaffold` deploys the Studio it writes this for you. The workspace title the Studio shows comes from `title` in `studio/sanity.config.ts`; the scaffold sets it to the project name.

Allow the Studio origin **with credentials** on the project, or logging in loops:

```bash
cd studio
pnpm exec sanity cors add https://<studio-host>.sanity.studio --credentials
```

Never allow a wildcard origin with credentials: any page on that domain could then make authenticated requests to the project.

## Default: Cloudflare Workers Builds

```
git push to main ----------------------------------> Workers Build -> live site
Studio (publish) -> Sanity webhook -> deploy hook --> Workers Build -> live site
```

Workers Builds builds the repository on Cloudflare and runs `wrangler deploy` there. A [deploy hook](https://developers.cloudflare.com/workers/ci-cd/builds/deploy-hooks/) is a secret URL that starts the same build on a `POST`, with no auth header. Requests that arrive while a build is still queued are folded into it, so a burst of publishes builds once.

### One time per Cloudflare account

These two things are done by hand once and reused by every site:

1. **Connect Cloudflare to GitHub.** Dashboard, Workers & Pages, any Worker, Settings, Builds, Connect, GitHub. This installs the Cloudflare GitHub app on your account and links it to Cloudflare. It is a GitHub authorisation, so it has no API. It also creates the account's _build token_, which Cloudflare's build system uses to deploy.
   - **Install it through this Connect flow, not from GitHub's side.** Cloudflare only knows installations made from its dashboard. One installed directly on GitHub fails with "This project is disconnected from your Git account".
   - **Repository access.** _All repositories_ means every future site needs no manual step. _Only select repositories_ means each new site's repository must be added (GitHub, Settings, Applications, Installed GitHub Apps, Cloudflare Workers and Pages, Configure) before the scaffold's deploy step.
   - **If the app's only repository is deleted**, GitHub removes the installation and the link breaks. Connect again from the dashboard.
2. **Create an API token for the scaffold.** My Profile, API Tokens, Create Token, Custom token, with two permissions: _Account, Workers Builds Configuration, Edit_ and _Account, Workers Scripts, Read_. It must be a user token (the Builds API rejects account tokens). Keep it in your password manager. The scaffold asks for it at a hidden prompt (or reads `CLOUDFLARE_BUILDS_TOKEN` from the environment), uses it for that run only and stores it nowhere.

### Per site (the scaffold does this)

Run `pnpm scaffold`, or on an existing project `node scripts/scaffold.ts --deploy-only`. It needs the Worker deployed once (the hosting step does that), the GitHub repository, the `gh` CLI and the Sanity CLI logged in. It then:

1. commits and pushes what the scaffold changed (the Worker name and domain route in `wrangler.jsonc`, any modules), after asking, because Cloudflare builds from GitHub;
2. connects the repository to the Worker (the production branch is the repository's default branch, usually `main`);
3. sets the build command to the same checks `deploy.yml` runs (`pnpm run typecheck && pnpm run lint && pnpm run build && pnpm run perf:size`) and the deploy command to `pnpm exec wrangler deploy`;
4. sets the build variables from `.env`: `PUBLIC_SITE_URL`, `SANITY_PROJECT_ID`, `SANITY_DATASET`, `NODE_VERSION` from `.nvmrc`, plus `SANITY_API_VERSION`, `PUBLIC_STYLEGUIDE` and `SANITY_READ_TOKEN` (as a secret) when present;
   - **preview builds** (every other branch, so pull requests get a Preview URL): the same build command and variables, with the Preview command `npx wrangler preview`. An existing preview trigger (the dashboard's Connect creates one) is always updated; when there is none, the scaffold creates it. This is on by default (the prompt defaults to yes, and a headless run creates it); `"previewBuilds": false` under `cloudflare` in the config file, or answering `n`, skips it. `wrangler preview` needs the `"previews": {}` block that `wrangler.jsonc` ships with. `PUBLIC_SITE_URL` stays the production URL, so a Preview's canonical links point at the live site;
5. creates a deploy hook named `sanity-publish` for the production branch;
6. creates the Sanity webhook `Rebuild site` pointing at the hook, using your Sanity CLI login. It also finds an older webhook that still calls GitHub and offers to delete it;
7. offers to delete the GitHub `PUBLIC_SITE_URL` variable, so `deploy.yml` stops deploying as well;
8. optionally starts a first build.

Every step is idempotent: re-running keeps what exists. Anything it cannot do goes to the closing to-do list.

### Build triggers

Workers Builds stores the settings above on a _trigger_, not on the Worker. A Worker has up to two: one for the production branch and one for every other branch (previews). Each trigger has its own build command, deploy command and variables, and each one builds on push.

The scaffold lists the Worker's triggers and updates the ones it finds. It creates the production trigger only when the list is empty, so it never adds a second one. When it finds more than it expects (two for the production branch, or one left from another repository or an older connection), it lists them and stops short of guessing: see "Builds ignore the settings shown in the dashboard" under Troubleshooting.

### If you connect in the dashboard

Connecting in the dashboard (Worker, Settings, Builds, Connect) creates the triggers itself, with Cloudflare's default commands (`pnpm run build`) and no variables. Then pick one:

- **Run `node scripts/scaffold.ts --deploy-only` once.** It finds those triggers and applies the commands and variables to them. Do not connect again afterwards: a new Connect creates new triggers with the defaults.
- **Or enter everything in the dashboard** (Settings, Builds: build command, deploy command, variables, for production and for previews), and do not run `--deploy-only`.

To do it by hand instead: connect the Worker in the dashboard (Settings, Builds), set the same commands and variables for production **and** for previews (the Previews settings are separate: build command, Preview command `npx wrangler preview`, and their own variables), create the deploy hook (Settings, Builds, Deploy Hooks), then a Sanity webhook with the hook URL, method `POST`, the filter shown under the GitHub Actions route, drafts off and no headers.

### Test it

Publish an edit in the Studio, then watch the Worker's build history in the dashboard, where the trigger shows the hook name. Each build has its log.

Verified end to end on a live site (custom domain, react-islands module): the scaffold set up the trigger, the variables, the deploy hook and the webhook through the real APIs; a Publish in the hosted Studio started a Workers Build (listed in the Worker's version history as `sanity-publish - deploy hook`) and the change went live; a push to `main` built and deployed as well.

What a build looks like in the dashboard:

- **From a Publish**: the version is labelled with the hook name, and the author is the Cloudflare account owner, since a hook has no Git author.
- **From a push**: the version shows the commit.

Two bugs that first run found are fixed in the scaffold: Sanity rejects a webhook without a projection string, and a module's edits must be formatted before they are committed, or `pnpm lint` fails the build.

## Alternative: GitHub Actions

```
Studio (publish) -> Sanity webhook -> GitHub repository_dispatch "sanity-publish"
                 -> Actions: deploy.yml (install, typecheck, lint, build, wrangler deploy)
                 -> live site
```

Choose option 2 at the scaffold's deploy step: it sets the repository variables with `gh`, asks for the GitHub token at a hidden prompt, creates the webhook, and lists the two Cloudflare secrets for you to set. The steps below are the manual equivalent.

### 1. GitHub token for the webhook

Create a fine-grained personal access token (or a GitHub App token) limited to this one repository with **Contents: Read and write**. `repository_dispatch` requires that permission. Store it only in the Sanity webhook configuration, never in the repo.

A fine-grained token expires. When it does, publishing keeps working in the Studio but **silently stops deploying**: nothing fails where an editor would see it. Write the expiry date down where you will see it (a calendar reminder works), and renew the token before then. The webhook's delivery log in Sanity Manage (API, Webhooks, the webhook, attempts) shows a `401` from GitHub once the token has expired; replace the token in the Authorization header to fix it.

### 2. Create the webhook

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
| `Authorization`        | `Bearer <token from step 1>`  |
| `Accept`               | `application/vnd.github+json` |
| `X-GitHub-Api-Version` | `2022-11-28`                  |

The Authorization value is the word `Bearer`, one space, then the token, with no quotes. Without the `Bearer ` prefix GitHub answers `401`.

The filter keeps drafts out. The projection produces the body GitHub expects (`event_type` plus a small `client_payload` including `_type` and `slug`). The workflow does not use the payload yet; it is there so a future incremental build can.

If you add a document type that renders pages, add it to the filter's `_type in [...]` list.

### 3. GitHub secrets and variables

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

### 4. Test it

Fire one dispatch by hand first. `read -rs` asks for the token without echoing it, so it stays out of your shell history:

```bash
read -rs GH_DISPATCH_TOKEN
curl -X POST https://api.github.com/repos/<owner>/<repo>/dispatches \
  -H "Authorization: Bearer $GH_DISPATCH_TOKEN" -H "Accept: application/vnd.github+json" \
  -d '{"event_type":"sanity-publish"}'
unset GH_DISPATCH_TOKEN
```

Then check the Actions tab for a `Deploy` run triggered by `repository_dispatch`, and publish a real edit in the Studio to test the whole chain.

## Troubleshooting

- **Webhook returns 401**: the Authorization value is missing the `Bearer ` prefix, or the token has expired. Check the webhook's delivery log in Sanity Manage, then fix the header or replace the token.
- **Webhook returns 404 or 403**: the token lacks Contents write on this repo, or the repo path is wrong.
- **`gh` says `accepts at most 1 arg(s), received 2`**: the command line carries an extra argument, usually an invisible character from a copied line, or an inline `# comment` (zsh passes `#` through as an argument in an interactive shell). Type the command by hand.
- **Workflow does not start**: `repository_dispatch` only fires workflows on the default branch. Make sure `deploy.yml` is on `main`.
- **Build fails after a publish**: the error names the document id (`[sanity] Document <id> failed validation`). Fix the content (missing alt text, slug, title) and publish again.
- **Build fails with `TypeError: Invalid URL`** (often while rendering `/404`), or canonical links look wrong: `PUBLIC_SITE_URL` in the host's build variables has a stray space or quotes; hosts store the value byte for byte. The build now trims both, but re-enter the value bare (`https://<your-site>`, no quotes, no spaces) anyway.
- **Site shows demo content**: `SANITY_PROJECT_ID` is not set in the build variables (Workers Builds) or the repository variables (GitHub Actions).
- **Every publish deploys twice**: both routes are active. Delete the `PUBLIC_SITE_URL` repository variable (Workers Builds route), or disconnect the Worker from Git (GitHub Actions route).
- **Workers Builds: "Invalid token"**: the API token used by the scaffold is an account token, or lacks _Workers Builds Configuration: Edit_. Create a user token with the two permissions listed above.
- **Workers Builds: "This project is disconnected from your Git account"**: Cloudflare's link to the GitHub app is gone (uninstalled, installed from GitHub's side, or removed with its only repository). Connect again from the Cloudflare dashboard (Worker, Settings, Builds, Connect, GitHub), then run `node scripts/scaffold.ts --deploy-only`.
- **Workers Builds: branch or pull-request builds fail with "PUBLIC_SITE_URL is not set"**: the preview trigger has Cloudflare's defaults (`pnpm run build`, no variables). Run `node scripts/scaffold.ts --deploy-only`, or copy the build command and every build variable from the production settings to the Previews settings in the dashboard.
- **Workers Builds: `wrangler preview` fails with "missing a `previews` block"**: `wrangler.jsonc` lost its `"previews": {}` entry. Put it back (`pnpm verify:template` checks for it).
- **Workers Builds: builds ignore the settings shown in the dashboard** (every push builds with `pnpm run build` and no variables, or fails with "PUBLIC_SITE_URL is not set", while the build settings page shows the scaffold's commands): the Worker has more than one trigger for the same branches, usually one left by an earlier connection next to the one the scaffold or the dashboard set up. The scaffold lists the triggers it finds when this happens. Fix: Worker, Settings, Builds, Disconnect; then Connect again and pick the repository; then run `node scripts/scaffold.ts --deploy-only` once (or enter the settings in the dashboard instead, not both). Check the first build's log shows the scaffold's build command.
- **Workers Builds: no build token, or the repository is not found**: the one-time GitHub connection is missing, or the Cloudflare GitHub app has no access to this repository (GitHub, Settings, Applications, Cloudflare Workers and Pages, Configure).
- **Changes appear late**: Sanity's API CDN can serve a cached read for a few seconds after publish. A second run, or `useCdn: false`, removes this at the cost of speed.
