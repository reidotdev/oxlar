/**
 * Turns an external link typed into Sanity into an absolute http(s) URL, or
 * null when it cannot be one.
 *
 * Why: an `href` without "//" is resolved against the current page. A social
 * link stored as "https:www.linkedin.com/in/…" reads, on an https page, as a
 * relative path and sends visitors to <site>/www.linkedin.com/in/…, a 404.
 * `new URL()` without a base accepts the same string, so parsing alone does
 * not catch it; the scheme and slashes are rebuilt from the raw text first.
 *
 * "www.x.com/a", "//x.com/a", "https:x.com/a" and "https:/x.com/a" all become
 * "https://…" (an explicit "http:" is kept). Anything else with a scheme
 * (mailto:, javascript:) and anything without a dotted host returns null.
 */
export function toExternalUrl(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  const scheme = /^([a-z][a-z\d+-]*):\/*/i.exec(raw);
  let candidate: string;
  if (scheme) {
    const name = scheme[1]?.toLowerCase();
    if (name !== "http" && name !== "https") return null;
    candidate = `${name}://${raw.slice(scheme[0].length)}`;
  } else {
    candidate = `https://${raw.replace(/^\/+/, "")}`;
  }

  try {
    const url = new URL(candidate);
    return url.hostname.includes(".") ? url.href : null;
  } catch {
    return null;
  }
}
