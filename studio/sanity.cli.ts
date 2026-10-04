import { defineCliConfig } from "sanity/cli";

// The CLI runs in Node, so it can also read the web package's root .env. (The
// Studio itself is bundled for the browser and only sees SANITY_STUDIO_* from
// studio/.env, see sanity.config.ts.) Values already in the shell win.
for (const file of [".env", "../.env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    /* file absent: fine */
  }
}

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
