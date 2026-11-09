/**
 * Pure helpers for the scaffold's Cloudflare account choice. They live apart
 * from scaffold.ts, which runs when it is imported, so tests can load them.
 */

export interface CfAccount {
  id: string;
  name: string;
}

/** A Cloudflare account id: 32 hex characters. */
export const isAccountId = (s: string) => /^[0-9a-f]{32}$/i.test(s);

/**
 * Reads `wrangler whoami --json` (wrangler 4). Logged in, it prints
 * `{ "loggedIn": true, "accounts": [{ "id", "name", ... }], ... }`; without a
 * login it prints `{ "loggedIn": false }` and exits non-zero. Anything else
 * (an older wrangler, a network error) counts as not logged in.
 */
export function parseWhoami(stdout: string): {
  loggedIn: boolean;
  accounts: CfAccount[];
} {
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  if (start === -1 || end < start) return { loggedIn: false, accounts: [] };
  try {
    const j = JSON.parse(stdout.slice(start, end + 1)) as {
      loggedIn?: unknown;
      accounts?: unknown;
    };
    const accounts = (Array.isArray(j.accounts) ? j.accounts : []).flatMap(
      (a: unknown) => {
        const { id, name } = (a ?? {}) as { id?: unknown; name?: unknown };
        return typeof id === "string" && id
          ? [{ id, name: typeof name === "string" ? name : id }]
          : [];
      },
    );
    return { loggedIn: j.loggedIn === true, accounts };
  } catch {
    return { loggedIn: false, accounts: [] };
  }
}

/** The top-level `"account_id"` in wrangler.jsonc text, ignoring commented-out lines. */
export function readAccountId(wrangler: string): string | undefined {
  return (
    /^\s*"account_id"\s*:\s*"([^"]+)"/m.exec(wrangler)?.[1]?.trim() || undefined
  );
}

/**
 * Sets `"account_id"` in wrangler.jsonc text, keeping its comments and
 * layout: replaces the value if the key exists, else adds it, with a comment
 * saying why, right after `"name"`. Returns the text unchanged when there is
 * no `"name"` line to anchor on, so the caller can defer instead.
 */
export function setAccountId(wrangler: string, id: string): string {
  const existing = /^(\s*"account_id"\s*:\s*")[^"]*(")/m;
  if (existing.test(wrangler)) return wrangler.replace(existing, `$1${id}$2`);
  return wrangler.replace(
    /^([ \t]*)("name"\s*:\s*"[^"]*",[^\n]*\n)/m,
    (_m, indent: string, line: string) =>
      `${indent}${line}${indent}// The Cloudflare account this Worker deploys to. Without it, a login with\n` +
      `${indent}// several accounts cannot deploy without a prompt (pnpm scaffold sets it).\n` +
      `${indent}"account_id": "${id}",\n`,
  );
}

/** An answer to the account prompt: its number in the list, its id or its exact name. */
export function pickAccount(
  accounts: CfAccount[],
  answer: string,
): CfAccount | undefined {
  const a = answer.trim();
  if (!a) return undefined;
  if (/^\d+$/.test(a) && !isAccountId(a)) return accounts[Number(a) - 1];
  return (
    accounts.find((x) => x.id.toLowerCase() === a.toLowerCase()) ??
    accounts.find((x) => x.name === a)
  );
}
