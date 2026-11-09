import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import {
  parseWhoami,
  pickAccount,
  readAccountId,
  setAccountId,
} from "../scripts/cloudflare-account.ts";

/*
 * Unit-level: how the scaffold picks the Cloudflare account and writes it
 * into wrangler.jsonc (scripts/cloudflare-account.ts). No page is loaded and
 * nothing calls wrangler or Cloudflare.
 */

const ID_A = "0123456789abcdef0123456789abcdef";
const ID_B = "fedcba9876543210fedcba9876543210";
const accounts = [
  { id: ID_A, name: "Agency" },
  { id: ID_B, name: "Client site" },
];

test("parses wrangler whoami --json, logged in and out", () => {
  const out = JSON.stringify({
    loggedIn: true,
    authType: "OAuth Token",
    email: "someone@example.com",
    accounts: accounts.map((a) => ({ ...a, type: "standard" })),
  });
  expect(parseWhoami(out)).toEqual({ loggedIn: true, accounts });
  expect(parseWhoami(`noise before\n${out}\n`).accounts).toHaveLength(2);
  expect(parseWhoami('{"loggedIn": false}')).toEqual({
    loggedIn: false,
    accounts: [],
  });
  expect(parseWhoami("You are not authenticated.").loggedIn).toBe(false);
  expect(parseWhoami("").loggedIn).toBe(false);
});

test("an answer picks an account by number, id or name, never a guess", () => {
  expect(pickAccount(accounts, "2")?.id).toBe(ID_B);
  expect(pickAccount(accounts, ` ${ID_A.toUpperCase()} `)?.id).toBe(ID_A);
  expect(pickAccount(accounts, "Client site")?.id).toBe(ID_B);
  expect(pickAccount(accounts, "3")).toBeUndefined();
  expect(pickAccount(accounts, "0")).toBeUndefined();
  expect(pickAccount(accounts, "")).toBeUndefined();
  expect(pickAccount(accounts, "someone else")).toBeUndefined();
});

test("account_id is added to wrangler.jsonc keeping its comments", () => {
  const template = readFileSync("wrangler.jsonc", "utf8");
  expect(readAccountId(template)).toBeUndefined();
  const next = setAccountId(template, ID_A);
  expect(readAccountId(next)).toBe(ID_A);
  // Everything that was there is still there, in order.
  expect(
    next.replace(/^.*(account_id|Cloudflare account|several).*\n/gm, ""),
  ).toBe(template);
  // The result is still JSON once comments and trailing commas are dropped.
  const json = next.replace(/^\s*\/\/.*$/gm, "").replace(/,(\s*[}\]])/g, "$1");
  expect((JSON.parse(json) as { account_id: string }).account_id).toBe(ID_A);
  // Re-running replaces the value instead of adding a second key.
  const again = setAccountId(next, ID_B);
  expect(readAccountId(again)).toBe(ID_B);
  expect(again.match(/"account_id"/g)).toHaveLength(1);
});

test("a commented-out account_id does not count, and no name means no change", () => {
  expect(readAccountId(`{\n  // "account_id": "${ID_A}",\n}`)).toBeUndefined();
  const noName = `{\n  "compatibility_date": "2026-10-01",\n}\n`;
  expect(setAccountId(noName, ID_A)).toBe(noName);
});
