import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import {
  isValidSubdomain,
  needsWorkersDevSubdomain,
  parseAuthToken,
  readWorkerName,
  subdomainDashboardUrl,
  toValidSubdomain,
} from "../scripts/workers-dev-subdomain.ts";

/*
 * Unit-level: how the scaffold recognises a first deploy on an account with
 * no workers.dev subdomain, and picks the name to register
 * (scripts/workers-dev-subdomain.ts). No page is loaded and nothing calls
 * wrangler or Cloudflare.
 */

const ID = "0123456789abcdef0123456789abcdef";

test("recognises wrangler 4's missing-subdomain output, and only that", () => {
  // Without a TTY: the warning, the question answered "no", the error.
  const declined = [
    "▲ [WARNING] You need to register a workers.dev subdomain before publishing to workers.dev",
    "? Would you like to register a workers.dev subdomain now?",
    "🤖 Using fallback value in non-interactive context: no",
    "✘ [ERROR] You can either deploy your worker to one or more routes by specifying them in your wrangler.jsonc file, or register a workers.dev subdomain here:",
    `https://dash.cloudflare.com/${ID}/workers/onboarding`,
  ].join("\n");
  expect(needsWorkersDevSubdomain(declined)).toBe(true);
  // Its automatic registration (coding agent detected) with a taken name.
  expect(
    needsWorkersDevSubdomain(
      `Wrangler could not automatically register "my-site" as your workers.dev subdomain because the name is unavailable.`,
    ),
  ).toBe(true);
  expect(
    needsWorkersDevSubdomain(
      'Wrangler could not verify whether "my-site" is available as your `workers.dev` subdomain.',
    ),
  ).toBe(true);
  // Other deploy failures are left alone.
  expect(
    needsWorkersDevSubdomain(
      "More than one account available but unable to select one in non-interactive mode.",
    ),
  ).toBe(false);
  expect(
    needsWorkersDevSubdomain(
      "Deployed my-site triggers\n  https://my-site.my-sub.workers.dev",
    ),
  ).toBe(false);
  expect(needsWorkersDevSubdomain("")).toBe(false);
});

test("the default name is the Worker name, made valid the way wrangler does", () => {
  const name = readWorkerName(readFileSync("wrangler.jsonc", "utf8"));
  expect(name).toBe("oxlar");
  expect(toValidSubdomain(name!)).toBe("oxlar");
  expect(toValidSubdomain("Rosto Website")).toBe("rosto-website");
  expect(toValidSubdomain("--my_site--")).toBe("my-site");
  expect(toValidSubdomain("x".repeat(80))).toHaveLength(63);
  expect(toValidSubdomain("!!!")).toBe("my-worker");
  expect(readWorkerName(`{\n  // "name": "old",\n}`)).toBeUndefined();
});

test("subdomain names follow wrangler's rule", () => {
  for (const ok of ["a", "rosto-website", "a1-b2", "x".repeat(63)])
    expect(isValidSubdomain(ok), ok).toBe(true);
  for (const bad of ["", "-a", "a-", "Upper", "a.b", "a_b", "x".repeat(64)])
    expect(isValidSubdomain(bad), bad).toBe(false);
});

test("reads a bearer token from wrangler auth token --json, never a global key", () => {
  expect(
    parseAuthToken(JSON.stringify({ type: "oauth", token: "abc" }, null, 2)),
  ).toBe("abc");
  expect(
    parseAuthToken(
      `noise\n${JSON.stringify({ type: "api_token", token: "t" })}`,
    ),
  ).toBe("t");
  expect(
    parseAuthToken(
      JSON.stringify({ type: "api_key", key: "k", email: "a@b.c" }),
    ),
  ).toBeUndefined();
  expect(
    parseAuthToken("Not logged in. Please run `wrangler login`."),
  ).toBeUndefined();
  expect(parseAuthToken('{"type": "oauth", "token": ""}')).toBeUndefined();
});

test("the dashboard link names the account", () => {
  expect(subdomainDashboardUrl(ID)).toBe(
    `https://dash.cloudflare.com/${ID}/workers/subdomain`,
  );
});
