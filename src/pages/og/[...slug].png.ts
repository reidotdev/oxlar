import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { APIRoute, GetStaticPaths } from "astro";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { getSiteSettings } from "../../lib/site.ts";
import { brandColors } from "../../lib/brand-colors.ts";
import { sanityFetch } from "../../lib/sanity/client.ts";
import { pagesQuery, postsQuery } from "../../lib/sanity/queries.ts";
import type {
  PagesQueryResult,
  PostsQueryResult,
} from "../../lib/sanity/sanity.types.ts";

type Card = { title: string; description: string };

export const getStaticPaths = (async () => {
  const [site, pages, posts] = await Promise.all([
    getSiteSettings(),
    sanityFetch<PagesQueryResult>(pagesQuery),
    sanityFetch<PostsQueryResult>(postsQuery),
  ]);
  const entries: Array<[string, Card]> = [
    ["index", { title: site.title, description: site.description }],
    ["blog", { title: "Blog", description: `Posts from ${site.title}.` }],
    ...pages.flatMap((p): Array<[string, Card]> =>
      p.slug && p.title
        ? [
            [
              p.slug,
              { title: p.title, description: p.excerpt ?? site.description },
            ],
          ]
        : [],
    ),
    ...posts.flatMap((p): Array<[string, Card]> =>
      p.slug && p.title
        ? [
            [
              `blog/${p.slug}`,
              { title: p.title, description: p.excerpt ?? site.description },
            ],
          ]
        : [],
    ),
  ];
  return entries.map(([slug, props]) => ({ params: { slug }, props }));
}) satisfies GetStaticPaths;

// Satori reads TTF/OTF/WOFF (not WOFF2). Fonts are self-hosted in public/fonts.
const font = (file: string) =>
  readFileSync(join(process.cwd(), "public/fonts", file));

export const GET: APIRoute<Card> = async ({ props }) => {
  const { title, description } = props;
  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: brandColors.dark,
          color: brandColors.onDark,
          fontFamily: "Inter",
        },
        children: [
          {
            type: "div",
            props: {
              style: { fontSize: 72, fontWeight: 700, lineHeight: 1.1 },
              children: title,
            },
          },
          {
            type: "div",
            props: {
              style: {
                fontSize: 32,
                marginTop: 24,
                color: brandColors.onDarkMuted,
              },
              children: description,
            },
          },
        ],
      },
    } as unknown as Parameters<typeof satori>[0],
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Inter",
          data: font("inter-latin-400-normal.woff"),
          weight: 400,
          style: "normal",
        },
        {
          name: "Inter",
          data: font("inter-latin-700-normal.woff"),
          weight: 700,
          style: "normal",
        },
      ],
    },
  );
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } })
    .render()
    .asPng();
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
};
