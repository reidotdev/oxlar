---
name: release-checklist
description: Pre-release checklist for an oxlar site: every check that must be green, content and SEO sanity, Sanity webhook and deploy verification. Use before launching a site, handing it over, or cutting a template release.
---

# Release checklist

Run in this order. Stop at the first failure and fix it.

## Code

- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm verify:template` (also confirms generated Sanity types are fresh)
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `PUBLIC_SITE_URL=<production url> pnpm build`
- [ ] `pnpm test` (axe on every route and `/styleguide`, light and dark; keyboard; no-JS; motion; SEO; vitals)
- [ ] `pnpm perf:size` (0 KB JS on plain pages, under 50 KB gzipped initial on animated pages)
- [ ] `pnpm perf` (Lighthouse mobile: Performance >= 95, Accessibility, Best Practices, SEO = 100)

## Content and SEO

- [ ] Real `siteSettings` (title, description, navigation, person or organization, social links)
- [ ] Every page and post has alt text on images and a sensible excerpt
- [ ] `PUBLIC_SITE_URL` is the production URL, not localhost (canonical links, sitemap, OG)
- [ ] OG images render (`/og/index.png`) and match the brand
- [ ] Decide on `/styleguide`: keep (noindex) or set `PUBLIC_STYLEGUIDE=false`
- [ ] Delete `public/demo/` (demo cover image used by the bundled fixtures) once real content exists
- [ ] Replace the template favicon (`public/favicon.svg`, regenerate the PNGs) and `site.webmanifest`
- [ ] Update `brand-colors.ts` to mirror the final `--paper`, `--dark` and brand tokens

## Sanity

- [ ] Studio deployed (`pnpm --filter oxlar-studio run deploy`) and the editors can log in
- [ ] CORS origins allowed WITH credentials for the Studio URL (never a wildcard)
- [ ] Webhook configured as in `docs/publishing.md`; publish a test edit and confirm the live page updates
- [ ] `SANITY_READ_TOKEN` is set only if the dataset is private
- [ ] Expiry date of the webhook's GitHub token written down, with a reminder to renew it (an expired token stops deploys silently; Sanity's webhook log shows `401`)

## Deploy

- [ ] GitHub secrets and variables set (names in `README.md`); secrets entered at the `gh secret set NAME` prompt, never with `--body`
- [ ] `deploy.yml` succeeds from `main`; `repository_dispatch` (`sanity-publish`) succeeds
- [ ] Response headers present (`curl -I`): CSP meta in HTML, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, immutable caching on `/_astro/*`
- [ ] 404 page served with status 404; redirects in `public/_redirects` work

## Hand-over

- [ ] `docs/design.md` reflects what was built
- [ ] `docs/comparison.md` numbers refreshed if this is a template release
