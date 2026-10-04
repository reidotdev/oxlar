import { siteUrl, type SiteSettings } from "./site.ts";

export interface SeoInput {
  title?: string | null | undefined;
  description?: string | null | undefined;
  /** Path such as "/about". */
  path: string;
  type?: "website" | "article";
  noindex?: boolean | null | undefined;
  /** Path of the OG image, defaults to /og/<slug>.png for the path. */
  ogImage?: string | undefined;
  publishedAt?: string | null | undefined;
  modifiedAt?: string | null | undefined;
  /** Extra JSON-LD nodes (BlogPosting, CreativeWork, ...). */
  jsonLd?: Record<string, unknown>[];
  breadcrumbs?: { name: string; path: string }[];
}

export interface SeoData {
  title: string;
  description: string;
  canonical: string;
  ogImage: string;
  type: "website" | "article";
  noindex: boolean;
  jsonLd: Record<string, unknown>[];
  publishedAt?: string | undefined;
  modifiedAt?: string | undefined;
}

export const abs = (path: string) => new URL(path, `${siteUrl}/`).toString();

export function ogPathFor(path: string): string {
  const slug = path.replace(/^\/|\/$/g, "") || "index";
  return `/og/${slug}.png`;
}

/** Fallback order: field, then document title/excerpt, then site settings. */
export function buildSeo(input: SeoInput, site: SiteSettings): SeoData {
  const pageTitle = input.title?.trim();
  const title =
    !pageTitle || pageTitle === site.title
      ? site.title
      : `${pageTitle} · ${site.title}`;
  const description = input.description?.trim() || site.description;
  const canonical = abs(
    input.path === "/" ? "/" : input.path.replace(/\/$/, ""),
  );

  const entity =
    site.entityType === "organization"
      ? {
          "@type": "Organization",
          name: site.entityName,
          url: siteUrl,
          sameAs: site.social.map((s) => s.url),
        }
      : {
          "@type": "Person",
          name: site.entityName,
          url: siteUrl,
          sameAs: site.social.map((s) => s.url),
        };

  const jsonLd: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: site.title,
      url: siteUrl,
      description: site.description,
    },
    { "@context": "https://schema.org", ...entity },
    ...(input.jsonLd ?? []).map((node) => ({
      "@context": "https://schema.org",
      ...node,
    })),
  ];

  if (input.breadcrumbs?.length) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: input.breadcrumbs.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: crumb.name,
        item: abs(crumb.path),
      })),
    });
  }

  return {
    title,
    description,
    canonical,
    ogImage: abs(input.ogImage ?? ogPathFor(input.path)),
    type: input.type ?? "website",
    noindex: input.noindex ?? false,
    jsonLd,
    publishedAt: input.publishedAt ?? undefined,
    modifiedAt: input.modifiedAt ?? undefined,
  };
}
