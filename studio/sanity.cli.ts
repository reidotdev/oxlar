import { defineCliConfig } from "sanity/cli";

const projectId =
  process.env.SANITY_STUDIO_PROJECT_ID ||
  process.env.SANITY_PROJECT_ID ||
  "placeholder";
const dataset =
  process.env.SANITY_STUDIO_DATASET ||
  process.env.SANITY_DATASET ||
  "production";

export default defineCliConfig({
  api: { projectId, dataset },
  // Studio is hosted separately: `pnpm --filter oxlar-studio deploy`.
  studioHost: process.env.SANITY_STUDIO_HOST || undefined,
  typegen: {
    path: "../src/lib/sanity/queries.ts",
    schema: "schema.json",
    generates: "../src/lib/sanity/sanity.types.ts",
  },
});
