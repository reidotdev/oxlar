import { expect, test } from "@playwright/test";
import { toExternalUrl } from "../src/lib/url.ts";

/*
 * Unit-level: social link URLs typed into Sanity (src/lib/site.ts). A link
 * stored as "https:www.linkedin.com/in/…" is resolved by a browser as a path
 * on this site. No page is loaded here.
 */

test("scheme-less and slash-less social URLs become absolute https", () => {
  for (const value of [
    "www.linkedin.com/in/alex-example",
    " www.linkedin.com/in/alex-example ",
    "//www.linkedin.com/in/alex-example",
    "https:www.linkedin.com/in/alex-example",
    "https:/www.linkedin.com/in/alex-example",
    "HTTPS://www.linkedin.com/in/alex-example",
  ]) {
    expect(toExternalUrl(value), value).toBe(
      "https://www.linkedin.com/in/alex-example",
    );
  }
  expect(toExternalUrl("https://github.com/reidotdev/oxlar")).toBe(
    "https://github.com/reidotdev/oxlar",
  );
  expect(toExternalUrl("http://example.com/a")).toBe("http://example.com/a");
});

test("values that cannot be an external http(s) link are rejected", () => {
  for (const value of [
    null,
    undefined,
    "",
    "   ",
    "alex-example",
    "/in/alex-example",
    "mailto:hello@example.com",
    "javascript:alert(1)",
    "ftp://example.com/file",
    "https://",
  ]) {
    expect(toExternalUrl(value), String(value)).toBeNull();
  }
});
