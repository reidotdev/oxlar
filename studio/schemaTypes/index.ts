import type { SchemaTypeDefinition } from "sanity";
import { pageType } from "./page";
import { postType } from "./post";
import { siteSettingsType } from "./site-settings";
import {
  seoType,
  imageWithAltType,
  calloutType,
  codeBlockType,
} from "./objects";

/**
 * Document types with exactly one document, whose id is the type name (see
 * structure.ts). sanity.config.ts hides them from "Create new" and removes
 * duplicate, delete and unpublish, so an editor cannot end up with a second
 * copy the site never reads, or none at all.
 */
export const singletonTypes = new Set(["siteSettings"]);

export const schemaTypes: SchemaTypeDefinition[] = [
  pageType,
  postType,
  siteSettingsType,
  seoType,
  imageWithAltType,
  calloutType,
  codeBlockType,
];
