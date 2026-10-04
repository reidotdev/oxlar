import type { APIRoute } from "astro";
import { isPreview, siteUrl } from "../lib/site.ts";

export const GET: APIRoute = () =>
  new Response(
    isPreview
      ? "User-agent: *\nDisallow: /\n"
      : `User-agent: *\nAllow: /\nDisallow: /styleguide\n\nSitemap: ${siteUrl}/sitemap-index.xml\n`,
    {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    },
  );
