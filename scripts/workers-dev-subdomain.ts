/**
 * Pure helpers for the scaffold's workers.dev subdomain step. They live apart
 * from scaffold.ts, which runs when it is imported, so tests can load them.
 *
 * A new Cloudflare account has no workers.dev subdomain. A Worker without
 * routes deploys to `<worker>.<subdomain>.workers.dev`, so its first deploy
 * needs one. wrangler 4 (deploy-helpers/src/triggers/subdomain.ts in its
 * bundle) checks `GET /accounts/{id}/workers/subdomain`; on error 10007 it
 * warns and asks to register one. Without a TTY the question answers "no"
 * and the deploy fails. Registering is `PUT /accounts/{id}/workers/subdomain`
 * with `{ "subdomain": "<name>" }`, once per account.
 */

/** What wrangler 4 prints when the account has no workers.dev subdomain. */
const MISSING = [
  // The warning before the question, and the error after a "no".
  /You need to register a workers\.dev subdomain/i,
  /register a workers\.dev subdomain here/i,
  // Its automatic registration (when it detects a coding agent) failed.
  /could not (automatically register|verify whether) .*workers\.dev.? subdomain/i,
];

/** True when a failed `wrangler deploy` failed for want of a workers.dev subdomain. */
export const needsWorkersDevSubdomain = (output: string) =>
  MISSING.some((re) => re.test(output));

/** wrangler's own rule for a workers.dev subdomain name. */
export const isValidSubdomain = (s: string) =>
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(s);

/** wrangler's own suggestion from a name (it uses the Worker name). */
export function toValidSubdomain(input: string): string {
  const s = input
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 63)
    .replace(/-+$/, "");
  return s || "my-worker";
}

/** The top-level `"name"` in wrangler.jsonc text (the Worker name). */
export function readWorkerName(wrangler: string): string | undefined {
  return /^\s*"name"\s*:\s*"([^"]+)"/m.exec(wrangler)?.[1]?.trim() || undefined;
}

/**
 * The bearer token from `wrangler auth token --json`: `{ "type": "oauth" |
 * "api_token", "token": "..." }`. A global API key (`"type": "api_key"`)
 * needs other headers, so it counts as none, as does anything unparsable.
 */
export function parseAuthToken(stdout: string): string | undefined {
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  if (start === -1 || end < start) return undefined;
  try {
    const j = JSON.parse(stdout.slice(start, end + 1)) as {
      type?: unknown;
      token?: unknown;
    };
    return (j.type === "oauth" || j.type === "api_token") &&
      typeof j.token === "string" &&
      j.token
      ? j.token
      : undefined;
  } catch {
    return undefined;
  }
}

/** Where the account's workers.dev subdomain is set or changed by hand. */
export const subdomainDashboardUrl = (accountId: string) =>
  `https://dash.cloudflare.com/${accountId}/workers/subdomain`;

/** Cloudflare's error code for a subdomain someone else has. */
export const SUBDOMAIN_TAKEN = 10031;
