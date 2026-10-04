import type { QueryParams } from "@sanity/client";
import {
  pageBySlugQuery,
  pageSlugsQuery,
  pagesQuery,
  postBySlugQuery,
  postsQuery,
  siteSettingsQuery,
} from "./queries.ts";

/**
 * Demo content for builds with no Sanity project, so the template builds, tests
 * and deploys green on a fresh clone. Replaced by real content the moment
 * SANITY_PROJECT_ID is set. Shapes mirror the GROQ projections in queries.ts.
 */

const block = (key: string, text: string, style = "normal") => ({
  _type: "block",
  _key: key,
  style,
  markDefs: [],
  children: [{ _type: "span", _key: `${key}s`, text, marks: [] }],
});

const cover = {
  _type: "imageWithAlt",
  _key: "cover",
  alt: "Abstract gradient with two translucent circles",
  caption: null,
  hotspot: null,
  crop: null,
  asset: {
    _id: "image-demo-1600x900-svg",
    url: "/demo/cover.svg",
    metadata: { dimensions: { width: 1600, height: 900 }, lqip: null },
  },
};

const site = {
  title: "oxlar",
  description:
    "A lean, near-zero-JS Astro starter for portfolio, showcase and blog sites.",
  entityType: "person",
  entityName: "Alex Example",
  footerText: "Built with oxlar.",
  navigation: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
  ],
  social: [{ label: "GitHub", url: "https://github.com/reidotdev/oxlar" }],
};

const pages = [
  {
    _id: "demo-page-about",
    _updatedAt: "2026-09-01T09:00:00Z",
    title: "About",
    slug: "about",
    excerpt: "What this site is, and how it stays fast.",
    body: [
      block("a1", "A site that ships HTML", "h2"),
      block(
        "a2",
        "Pages are rendered once at build time. Scripts load only where a page needs them.",
      ),
      {
        _type: "callout",
        _key: "a3",
        tone: "info",
        text: "Every page here is plain HTML and CSS unless a component asks for more.",
      },
      { ...cover, _key: "a4" },
    ],
    seo: null,
  },
];

const posts = [
  {
    _id: "demo-post-1",
    _updatedAt: "2026-09-20T09:00:00Z",
    title: "Zero JavaScript by default",
    slug: "zero-javascript-by-default",
    excerpt: "Why a content site does not need a runtime on every page.",
    publishedAt: "2026-09-20T09:00:00Z",
    image: cover,
    body: [
      block(
        "p1",
        "Most pages are text, images and a few widgets. Shipping a framework runtime to render them costs speed and buys nothing.",
      ),
      block("p2", "What the platform gives you", "h2"),
      block(
        "p3",
        "Native dialogs, popovers, details and form validation cover most widgets with no script at all.",
      ),
      {
        _type: "codeBlock",
        _key: "p4",
        language: "html",
        code: '<details name="faq">\n  <summary>Does it need JS?</summary>\n  <p>No.</p>\n</details>',
      },
    ],
    seo: null,
  },
  {
    _id: "demo-post-2",
    _updatedAt: "2026-09-27T09:00:00Z",
    title: "Motion without the cost",
    slug: "motion-without-the-cost",
    excerpt: "GSAP loads only on pages that animate.",
    publishedAt: "2026-09-27T09:00:00Z",
    image: null,
    body: [
      block(
        "m1",
        "Animation code is loaded lazily, after first paint, and only when a page has animated elements.",
      ),
      {
        _type: "callout",
        _key: "m2",
        tone: "warning",
        text: "Animate transform and opacity only.",
      },
    ],
    seo: { title: null, description: null, noindex: false },
  },
];

/** Resolve a demo answer for a query from queries.ts. */
export function fixtureFor(query: string, params: QueryParams): unknown {
  const slug = params["slug"];
  switch (query) {
    case siteSettingsQuery:
      return site;
    case pagesQuery:
      return pages.map(({ _id, title, slug, excerpt, _updatedAt }) => ({
        _id,
        title,
        slug,
        excerpt,
        _updatedAt,
      }));
    case pageSlugsQuery:
      return pages.map(({ _id, slug }) => ({ _id, slug }));
    case pageBySlugQuery:
      return pages.find((p) => p.slug === slug) ?? null;
    case postsQuery:
      return [...posts]
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
        .map(
          ({ _id, title, slug, excerpt, publishedAt, _updatedAt, image }) => ({
            _id,
            title,
            slug,
            excerpt,
            publishedAt,
            _updatedAt,
            image,
          }),
        );
    case postBySlugQuery:
      return posts.find((p) => p.slug === slug) ?? null;
    default:
      throw new Error(`[sanity] No demo fixture for this query:\n${query}`);
  }
}
