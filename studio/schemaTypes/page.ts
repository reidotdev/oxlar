import { defineField, defineType } from "sanity";

/**
 * Ported from BMT-214A. The original fields (title, slug, excerpt, body) keep
 * their names and validation. `seo` and the richer `body` members are additive
 * and optional, so existing datasets keep working unchanged.
 */
export const pageType = defineType({
  name: "page",
  title: "Page",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title" },
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "excerpt", title: "Excerpt", type: "text", rows: 3 }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      of: [
        { type: "block" },
        { type: "imageWithAlt" },
        { type: "callout" },
        { type: "codeBlock" },
      ],
    }),
    defineField({ name: "seo", title: "SEO", type: "seo" }),
  ],
  preview: { select: { title: "title", subtitle: "slug.current" } },
});
