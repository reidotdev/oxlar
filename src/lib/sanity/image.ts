import { createImageUrlBuilder } from "@sanity/image-url";
import { client, sanityConfigured } from "./client.ts";

const builder = createImageUrlBuilder(client);

export interface ImageSource {
  asset?: { _id?: string | null; url?: string | null } | null;
  hotspot?: { x?: number; y?: number; width?: number; height?: number } | null;
  crop?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  } | null;
}

/** Width descriptors for srcset. Capped at the source width by the caller. */
export const DEFAULT_WIDTHS = [320, 480, 640, 800, 1024, 1280, 1600, 2000];

/**
 * Build an optimised URL: `auto=format` (AVIF/WebP by Accept header), quality,
 * width, with the editor's hotspot and crop honoured by @sanity/image-url.
 * Demo content (no project) passes its local URL through untouched.
 */
export function imageUrl(
  source: ImageSource,
  width: number,
  quality = 80,
): string {
  const direct = source.asset?.url;
  if (!sanityConfigured && direct) return direct;
  return builder
    .image(source as Parameters<typeof builder.image>[0])
    .width(width)
    .auto("format")
    .quality(quality)
    .fit("max")
    .url();
}
