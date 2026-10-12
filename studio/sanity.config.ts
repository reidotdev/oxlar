import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes, singletonTypes } from "./schemaTypes";
import { structure } from "./structure";

// Same env names as the web package. A syntactically valid placeholder keeps
// `sanity schema extract` working before a project exists.
const projectId =
  process.env.SANITY_STUDIO_PROJECT_ID ||
  process.env.SANITY_PROJECT_ID ||
  "placeholder";
const dataset =
  process.env.SANITY_STUDIO_DATASET ||
  process.env.SANITY_DATASET ||
  "production";

export default defineConfig({
  name: "default",
  title: "oxlar",
  projectId,
  dataset,
  schema: {
    types: schemaTypes,
    // Singletons are opened from the structure, never created from "+".
    templates: (templates) =>
      templates.filter(({ schemaType }) => !singletonTypes.has(schemaType)),
  },
  document: {
    // ...and never duplicated, deleted or unpublished.
    actions: (actions, { schemaType }) =>
      singletonTypes.has(schemaType)
        ? actions.filter(
            ({ action }) =>
              action !== "duplicate" &&
              action !== "delete" &&
              action !== "unpublish",
          )
        : actions,
  },
  plugins: [structureTool({ structure }), visionTool()],
});
