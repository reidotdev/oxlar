import { defineField, defineType } from "sanity";

export const seoType = defineType({
  name: "seo",
  title: "SEO",
  type: "object",
  fields: [
    defineField({
      name: "title",
      type: "string",
      description: "Falls back to the document title.",
    }),
    defineField({
      name: "description",
      type: "text",
      rows: 3,
      description: "Falls back to the excerpt. Aim for under 160 characters.",
      validation: (rule) =>
        rule
          .max(200)
          .warning("Long descriptions get truncated in search results."),
    }),
    defineField({ name: "noindex", type: "boolean", initialValue: false }),
  ],
});

export const imageWithAltType = defineType({
  name: "imageWithAlt",
  title: "Image",
  type: "image",
  options: { hotspot: true },
  fields: [
    defineField({
      name: "alt",
      type: "string",
      title: "Alternative text",
      description:
        "Describe the image for people who cannot see it. Use an empty string only for purely decorative images.",
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "caption", type: "string" }),
  ],
});

export const calloutType = defineType({
  name: "callout",
  title: "Callout",
  type: "object",
  fields: [
    defineField({
      name: "tone",
      type: "string",
      options: { list: ["info", "warning"], layout: "radio" },
      initialValue: "info",
    }),
    defineField({
      name: "text",
      type: "text",
      rows: 3,
      validation: (rule) => rule.required(),
    }),
  ],
  preview: { select: { title: "text", subtitle: "tone" } },
});

export const codeBlockType = defineType({
  name: "codeBlock",
  title: "Code",
  type: "object",
  fields: [
    defineField({ name: "language", type: "string", initialValue: "text" }),
    defineField({
      name: "code",
      type: "text",
      rows: 8,
      validation: (rule) => rule.required(),
    }),
  ],
  preview: { select: { title: "language", subtitle: "code" } },
});
