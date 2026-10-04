import { expect, test } from "@playwright/test";

test("robots.txt points at the sitemap and hides the styleguide", async ({
  request,
}) => {
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
  const text = await res.text();
  expect(text).toContain("Sitemap: http://localhost:4321/sitemap-index.xml");
  expect(text).toContain("Disallow: /styleguide");
});

test("sitemap lists content and excludes the styleguide", async ({
  request,
}) => {
  const index = await (await request.get("/sitemap-index.xml")).text();
  expect(index).toContain("sitemap-0.xml");
  const sitemap = await (await request.get("/sitemap-0.xml")).text();
  expect(sitemap).toContain("http://localhost:4321/about");
  expect(sitemap).toContain(
    "http://localhost:4321/blog/zero-javascript-by-default",
  );
  expect(sitemap).not.toContain("styleguide");
  expect(sitemap).not.toContain("404");
});

test("RSS feed lists posts", async ({ request }) => {
  const res = await request.get("/rss.xml");
  expect(res.headers()["content-type"]).toContain("xml");
  expect(await res.text()).toContain("Zero JavaScript by default");
});

test("OG endpoint returns a 1200x630 PNG", async ({ request }) => {
  for (const path of [
    "/og/index.png",
    "/og/about.png",
    "/og/blog/zero-javascript-by-default.png",
  ]) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/png");
    const body = await res.body();
    expect(body.subarray(1, 4).toString()).toBe("PNG");
    expect(body.readUInt32BE(16)).toBe(1200);
    expect(body.readUInt32BE(20)).toBe(630);
  }
});

test("a post carries metadata, canonical, OG and valid JSON-LD", async ({
  page,
}) => {
  await page.goto("/blog/zero-javascript-by-default");
  await expect(page).toHaveTitle("Zero JavaScript by default · oxlar");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://localhost:4321/blog/zero-javascript-by-default",
  );
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
    "content",
    "article",
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "http://localhost:4321/og/blog/zero-javascript-by-default.png",
  );
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('meta[name="viewport"]')).toHaveCount(1);
  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  const nodes = blocks.map((b) => JSON.parse(b) as Record<string, unknown>);
  const types = nodes.map((n) => n["@type"]);
  expect(types).toEqual(
    expect.arrayContaining([
      "WebSite",
      "Person",
      "BlogPosting",
      "BreadcrumbList",
    ]),
  );
  const post = nodes.find((n) => n["@type"] === "BlogPosting") as Record<
    string,
    unknown
  >;
  expect(post["headline"]).toBe("Zero JavaScript by default");
  expect(post["datePublished"]).toBe("2026-09-20T09:00:00Z");
  const crumbs = nodes.find((n) => n["@type"] === "BreadcrumbList") as {
    itemListElement: unknown[];
  };
  expect(crumbs.itemListElement).toHaveLength(3);
});

test("a content page uses CreativeWork; the styleguide and 404 are noindex", async ({
  page,
}) => {
  await page.goto("/about");
  const types = (
    await page.locator('script[type="application/ld+json"]').allTextContents()
  ).map((b) => (JSON.parse(b) as Record<string, unknown>)["@type"]);
  expect(types).toContain("CreativeWork");
  await page.goto("/styleguide");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  await page.goto("/does-not-exist");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

test("pages are crawlable HTML: content is in the source, not injected", async ({
  request,
}) => {
  const html = await (await request.get("/about")).text();
  expect(html).toContain("A site that ships HTML");
  expect(html).toContain('<link rel="canonical"');
});

test("a strict CSP is present and nothing violates it", async ({ page }) => {
  const violations: string[] = [];
  page.on(
    "console",
    (m) =>
      /Content Security Policy|Refused to/i.test(m.text()) &&
      violations.push(m.text()),
  );
  for (const path of [
    "/",
    "/about",
    "/blog/zero-javascript-by-default",
    "/styleguide",
  ]) {
    await page.goto(path, { waitUntil: "networkidle" });
    const csp = await page
      .locator('meta[http-equiv="content-security-policy"]')
      .getAttribute("content");
    expect(csp).toContain("default-src 'self'");
    expect(csp).not.toContain("'unsafe-inline'");
    expect(csp).not.toContain("'unsafe-eval'");
  }
  expect(violations).toEqual([]);
});
