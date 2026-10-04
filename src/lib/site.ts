import { sanityFetch } from "./sanity/client.ts";
import { siteSettingsQuery } from "./sanity/queries.ts";
import type { SiteSettingsQueryResult } from "./sanity/sanity.types.ts";

/** `PREVIEW=true` builds the draft preview site (see docs/preview.md when the module is added). Never set in production. */
export const isPreview = import.meta.env.PREVIEW === "true";

export const siteUrl = (
  import.meta.env.PUBLIC_SITE_URL ?? "http://localhost:4321"
).replace(/\/$/, "");

export interface SiteSettings {
  title: string;
  description: string;
  entityType: "person" | "organization";
  entityName: string;
  footerText: string | null;
  navigation: { label: string; href: string }[];
  social: { label: string; url: string }[];
}

const FALLBACK: SiteSettings = {
  title: "oxlar",
  description:
    "A lean, near-zero-JS Astro starter for portfolio, showcase and blog sites.",
  entityType: "person",
  entityName: "oxlar",
  footerText: null,
  navigation: [],
  social: [],
};

/** Site-wide data (navigation, footer, defaults). Cached for the whole build. */
export async function getSiteSettings(): Promise<SiteSettings> {
  const data = await sanityFetch<SiteSettingsQueryResult>(siteSettingsQuery);
  if (!data) return FALLBACK;
  return {
    title: data.title ?? FALLBACK.title,
    description: data.description ?? FALLBACK.description,
    entityType: data.entityType ?? "person",
    entityName: data.entityName ?? data.title ?? FALLBACK.entityName,
    footerText: data.footerText ?? null,
    navigation: (data.navigation ?? []).flatMap((n) =>
      n.label && n.href ? [{ label: n.label, href: n.href }] : [],
    ),
    social: (data.social ?? []).flatMap((s) =>
      s.label && s.url ? [{ label: s.label, url: s.url }] : [],
    ),
  };
}
