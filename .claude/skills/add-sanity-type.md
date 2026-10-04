---
name: add-sanity-type
description: Add a Sanity document type end to end in oxlar: schema, query, generated types, demo fixture, page and build-time validation. Use when the user wants a new kind of content such as projects, case studies, testimonials or team members.
---

# Add a Sanity document type

Existing datasets must keep working: **add fields and types, never rename or remove them** without owner approval.

## Steps

1. **Schema** in `studio/schemaTypes/<name>.ts` using `defineType`/`defineField`. Required fields get `validation: (rule) => rule.required()`. Images use the `imageWithAlt` type (alt text required). Register it in `studio/schemaTypes/index.ts` and add a list item in `studio/structure.ts`.
2. **Query** in `src/lib/sanity/queries.ts` with the `groq` tag. Project only what pages need. Images use the shared `imageFields` fragment so `SanityImage` gets dimensions, hotspot and crop.
3. **Types**: `pnpm sanity:types`. Commit `src/lib/sanity/sanity.types.ts`. `verify:template` fails when it is stale.
4. **Fixture**: add demo content to `src/lib/sanity/fixtures.ts` and a `case` for each new query in `fixtureFor()`, so the site still builds with no credentials.
5. **Page**: a route under `src/pages/` using `sanityFetch<NameQueryResult>(query, params)`. Dynamic routes use `getStaticPaths`. Render body content with `portable-text/RichText.astro` and images with `SanityImage.astro`.
6. **Validation**: extend `src/lib/sanity/validate.ts` for anything the schema cannot enforce (alt text on nested images, reserved slugs). Failures must name the document id.
7. **SEO**: use `buildSeo()`; choose the JSON-LD type (`CreativeWork` for case studies, `BlogPosting` for posts). Add OG entries in `src/pages/og/[...slug].png.ts`, sitemap comes automatically.
8. **Publishing**: if the type's slug lives under a new path, update the webhook filter in `docs/publishing.md`.
9. **Tests**: add the route to `tests/helpers.ts` (axe) and an SEO assertion.

## Check

`pnpm sanity:types && pnpm typecheck && pnpm lint && pnpm verify:template && pnpm test && pnpm build`.
