import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { getSiteSettings, siteUrl } from "../lib/site.ts";
import { sanityFetch } from "../lib/sanity/client.ts";
import { postsQuery } from "../lib/sanity/queries.ts";
import type { PostsQueryResult } from "../lib/sanity/sanity.types.ts";

export const GET: APIRoute = async () => {
  const [site, posts] = await Promise.all([
    getSiteSettings(),
    sanityFetch<PostsQueryResult>(postsQuery),
  ]);
  return rss({
    title: site.title,
    description: site.description,
    site: siteUrl,
    items: posts.flatMap((p) =>
      p.slug && p.title
        ? [
            {
              title: p.title,
              description: p.excerpt ?? "",
              pubDate: new Date(p.publishedAt ?? p._updatedAt),
              link: `/blog/${p.slug}`,
            },
          ]
        : [],
    ),
  });
};
