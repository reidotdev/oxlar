import type {
  PageBySlugQueryResult,
  PostBySlugQueryResult,
} from "./sanity.types.ts";

type Doc = Pick<
  NonNullable<PageBySlugQueryResult | PostBySlugQueryResult>,
  "_id" | "title" | "slug" | "body"
>;

/**
 * Build-time content checks. Throws one readable error naming the document id,
 * so an editor mistake fails the build instead of shipping a broken page.
 *
 * SEO title and description are NOT required: pages created before the `seo`
 * field existed fall back to the title and excerpt (see lib/seo.ts).
 */
export function validateDocument(doc: Doc): void {
  const problems: string[] = [];
  if (!doc.title) problems.push("missing title");
  if (!doc.slug) problems.push("missing slug");

  for (const block of doc.body ?? []) {
    if (block._type === "imageWithAlt") {
      if (!block.asset) problems.push(`image block ${block._key} has no image`);
      if (block.alt === null || block.alt === undefined) {
        problems.push(
          `image block ${block._key} is missing alt text (use "" only for decorative images)`,
        );
      }
    }
  }

  if (problems.length) {
    throw new Error(
      `[sanity] Document ${doc._id} (${doc.title ?? "untitled"}) failed validation:\n  - ${problems.join("\n  - ")}`,
    );
  }
}
