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

export const schemaTypes: SchemaTypeDefinition[] = [
  pageType,
  postType,
  siteSettingsType,
  seoType,
  imageWithAltType,
  calloutType,
  codeBlockType,
];
