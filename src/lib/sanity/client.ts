import { createClient, type QueryParams } from "@sanity/client";
import { fixtureFor } from "./fixtures.ts";

/**
 * The only module that talks to Sanity. Build-time only: nothing here is ever
 * imported by client scripts.
 *
 * Env values are read the way a deploy delivers them: quotes and whitespace
 * stripped (hosts store bytes verbatim, so `KEY="abc"` arrives with the quotes),
 * then validated. A malformed value degrades to "not configured" with a warning.
 */
function readEnv(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/^(['"])([\s\S]*)\1$/, "$2")
    .trim();
}

function guard(name: string, value: string, rule: RegExp): string {
  if (!value) return "";
  if (rule.test(value)) return value;
  console.warn(
    `[sanity] Ignoring ${name}=${JSON.stringify(value)}: it does not match ${rule}. ` +
      "Building with demo content. Check the value for stray quotes or whitespace.",
  );
  return "";
}

const env = { ...process.env, ...import.meta.env } as Record<
  string,
  string | undefined
>;

export const projectId = guard(
  "SANITY_PROJECT_ID",
  readEnv(env["SANITY_PROJECT_ID"]),
  /^[a-z0-9-]+$/,
);
export const dataset =
  guard("SANITY_DATASET", readEnv(env["SANITY_DATASET"]), /^[a-z0-9_-]+$/) ||
  "production";
export const apiVersion = readEnv(env["SANITY_API_VERSION"]) || "2025-01-01";
const token = readEnv(env["SANITY_READ_TOKEN"]) || undefined;
export const isPreview = env["PREVIEW"] === "true";

/** True once a real project id is present. False means demo content. */
export const sanityConfigured = projectId.length > 0;

export const client = createClient({
  projectId: projectId || "placeholder",
  dataset,
  apiVersion,
  // CDN for production builds. Preview needs fresh drafts, so no CDN.
  useCdn: !isPreview,
  perspective: isPreview ? "drafts" : "published",
  ...(isPreview && token ? { token } : {}),
});

const cache = new Map<string, Promise<unknown>>();

/**
 * Run a query from queries.ts. Identical (query, params) calls inside one build
 * share a single request. Without a project id the bundled demo content answers.
 */
export function sanityFetch<T>(
  query: string,
  params: QueryParams = {},
): Promise<T> {
  const key = query + JSON.stringify(params);
  let hit = cache.get(key);
  if (!hit) {
    hit = sanityConfigured
      ? client.fetch<T>(query, params)
      : Promise.resolve(fixtureFor(query, params));
    cache.set(key, hit);
  }
  return hit as Promise<T>;
}
