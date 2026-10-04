import type { APIRoute } from "astro";
import { siteUrl } from "../lib/site.ts";

export const GET: APIRoute = () =>
  new Response(
    `User-agent: *\nAllow: /\nDisallow: /styleguide\n\nSitemap: ${siteUrl}/sitemap-index.xml\n`,
    {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    },
  );
