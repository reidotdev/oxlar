# Draft preview build

This file arrived with the **preview module**. A static site cannot show drafts, so preview is a second build of the same code on its own URL.

## How it works

`PREVIEW=true` makes `src/lib/sanity/client.ts` use the `drafts` perspective with `SANITY_READ_TOKEN` and no CDN, and makes `src/lib/seo.ts` and `robots.txt` noindex everything. It never affects the production build: production does not set `PREVIEW`.

```bash
PREVIEW=true SANITY_READ_TOKEN=<viewer token> PUBLIC_SITE_URL=https://preview.example.com pnpm build
pnpm exec wrangler deploy --config wrangler.preview.jsonc
```

`wrangler.preview.jsonc` deploys the same `dist/` to a separate Worker (`<name>-preview`). Put it behind Cloudflare Access so only editors can open it.

## Wiring a trigger

Create a second Sanity webhook that includes drafts (no `!(_id in path("drafts.**"))` filter) and fires a `repository_dispatch` of type `sanity-preview`. Add a workflow like `deploy.yml` with that trigger, `PREVIEW: "true"`, the preview secrets and `wrangler deploy --config wrangler.preview.jsonc`.

## Status

The code path (`PREVIEW`) is implemented, but this module was not exercised against a live Sanity dataset in the build environment. Verify it with a real draft before relying on it. Sanity Visual Editing (click-to-edit overlays) is NOT included; it needs a runtime and is a separate decision.
