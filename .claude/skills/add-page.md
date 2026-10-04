---
name: add-page
description: Add a page or route to the oxlar site, either content from Sanity (a `page` or `post` document) or a bespoke Astro route. Use when the user asks for a new page, section of the site, landing page or route.
---

# Add a page

Decide which kind it is first.

## A. Content page (most pages)

No code. Create a `page` document in the Studio with a title, slug, excerpt and body. It is served at `/<slug>` by `src/pages/[slug].astro`, gets an OG image, a sitemap entry, a `CreativeWork` JSON-LD node and a breadcrumb for free.

- Reserved slugs (`src/lib/reserved.ts`): `blog`, `styleguide`, `og`, `404`, `rss.xml`, `robots.txt`. The build fails on a collision.
- Add it to the navigation through the `siteSettings` document, not in code.
- A new publish triggers a rebuild through the webhook (`docs/publishing.md`).

## B. Bespoke route

1. Create `src/pages/<name>.astro`:

   ```astro
   ---
   import BaseLayout from "../layouts/BaseLayout.astro";
   import Section from "../components/Section.astro";
   import Heading from "../components/Heading.astro";
   import { getSiteSettings } from "../lib/site.ts";
   import { buildSeo } from "../lib/seo.ts";

   const site = await getSiteSettings();
   const seo = buildSeo(
     { path: "/<name>", title: "Title", description: "One sentence." },
     site,
   );
   ---

   <BaseLayout seo={seo} site={site}>
     <Section>
       <Heading level={1}>Title</Heading>
     </Section>
   </BaseLayout>
   ```

2. Data comes from Sanity only through `sanityFetch(query, params)` with a query in `src/lib/sanity/queries.ts`. For dynamic routes use `getStaticPaths`.
3. One `<h1>`. Use `Section`, `Heading`, `Text`, `Grid`, `Card`. No inline styles, no raw values.
4. If the page should have its own social card, add an entry to `entries` in `src/pages/og/[...slug].png.ts` and pass `ogImage`.
5. Below-the-fold sections may use `<Reveal>`. The first screen never does.
6. Add the route to `routes` in `tests/helpers.ts` so axe covers it in light and dark.

## Check

`pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm perf:size`. The new page must ship 0 KB JS unless it uses an island or motion.
