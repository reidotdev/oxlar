import { defineArrayMember, defineField, defineType } from "sanity";

/** Singleton: the document id is always `siteSettings` (see structure.ts). */
export const siteSettingsType = defineType({
  name: "siteSettings",
  title: "Site settings",
  type: "document",
  fields: [
    defineField({
      name: "title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "description",
      type: "text",
      rows: 3,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "entityType",
      title: "This site is for",
      type: "string",
      options: {
        list: [
          { title: "A person", value: "person" },
          { title: "An organization", value: "organization" },
        ],
        layout: "radio",
      },
      initialValue: "person",
    }),
    defineField({
      name: "entityName",
      title: "Person or organization name",
      type: "string",
    }),
    defineField({
      name: "navigation",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          name: "navItem",
          fields: [
            defineField({
              name: "label",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "href",
              type: "string",
              description: "Path (/about) or full URL.",
              validation: (rule) => rule.required(),
            }),
          ],
          preview: { select: { title: "label", subtitle: "href" } },
        }),
      ],
    }),
    defineField({
      name: "social",
      title: "Social links",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          name: "socialLink",
          fields: [
            defineField({
              name: "label",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "url",
              type: "url",
              validation: (rule) => rule.required(),
            }),
          ],
          preview: { select: { title: "label", subtitle: "url" } },
        }),
      ],
    }),
    defineField({ name: "footerText", type: "string" }),
  ],
  preview: { prepare: () => ({ title: "Site settings" }) },
});
