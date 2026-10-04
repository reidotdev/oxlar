import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// Astro does not load .env into this config file, so do it here (Node built-in).
// Variables already set in the shell win over the file.
try {
  process.loadEnvFile(".env");
} catch {
  /* no .env: fine */
}

const isBuild = process.argv.includes("build");
const site = process.env.PUBLIC_SITE_URL?.trim().replace(/\/$/, "");

if (isBuild && !site) {
  throw new Error(
    "PUBLIC_SITE_URL is not set. Production builds need the canonical site URL " +
      "(sitemap, canonical links, OG tags). Example: PUBLIC_SITE_URL=https://example.com",
  );
}

/** Set PUBLIC_STYLEGUIDE=false to leave /styleguide out of the production build. */
const dropStyleguide = {
  name: "oxlar:drop-styleguide",
  hooks: {
    "astro:build:done": ({ dir }) => {
      if (process.env.PUBLIC_STYLEGUIDE === "false") {
        rmSync(fileURLToPath(new URL("styleguide/", dir)), {
          recursive: true,
          force: true,
        });
      }
    },
  },
};

export default defineConfig({
  site: site ?? "http://localhost:4321",
  output: "static",
  trailingSlash: "ignore",
  build: { inlineStylesheets: "auto", format: "directory" },
  security: {
    // Astro hashes every inline script and style it emits into a <meta> CSP.
    // frame-ancestors cannot be set from a meta tag, so public/_headers adds it.
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' https://cdn.sanity.io",
        "font-src 'self'",
        "media-src 'self' https:",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
    },
  },
  integrations: [
    sitemap({ filter: (page) => !page.includes("/styleguide") }),
    dropStyleguide,
  ],
});
