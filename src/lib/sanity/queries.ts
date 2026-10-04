import groq from "groq";

/**
 * Every GROQ query lives in this file. Pages and components never write
 * queries inline. Run `pnpm sanity:types` after editing a query or a schema.
 */

const imageFields = groq`{
  _type, alt, caption, hotspot, crop,
  "asset": asset->{ _id, url, metadata { dimensions { width, height }, lqip } }
}`;

export const siteSettingsQuery = groq`*[_id == "siteSettings"][0]{
  title, description, entityType, entityName, footerText,
  navigation[]{ label, href },
  social[]{ label, url }
}`;

export const pagesQuery = groq`*[_type == "page" && defined(slug.current)] | order(title asc){
  _id, title, "slug": slug.current, excerpt, _updatedAt
}`;

export const pageSlugsQuery = groq`*[_type == "page" && defined(slug.current)]{ _id, "slug": slug.current }`;

export const pageBySlugQuery = groq`*[_type == "page" && slug.current == $slug][0]{
  _id, _updatedAt, title, "slug": slug.current, excerpt,
  body[]{ ..., _type == "imageWithAlt" => ${imageFields} },
  seo
}`;

export const postsQuery = groq`*[_type == "post" && defined(slug.current)] | order(publishedAt desc){
  _id, title, "slug": slug.current, excerpt, publishedAt, _updatedAt,
  "image": image${imageFields}
}`;

export const postBySlugQuery = groq`*[_type == "post" && slug.current == $slug][0]{
  _id, _updatedAt, title, "slug": slug.current, excerpt, publishedAt,
  "image": image${imageFields},
  body[]{ ..., _type == "imageWithAlt" => ${imageFields} },
  seo
}`;
