import type { Settings } from "@boldvideo/bold-js";

/**
 * Extended metadata with additional properties not yet in bold-js SDK
 */
export interface ExtendedMetaData {
  title?: string;
  title_suffix?: string;
  description?: string;
  image?: string;
  social_graph_image_url?: string;
}

/**
 * Helper to cast metadata to extended type
 */
export function asExtendedMetaData(
  meta: Settings["meta_data"]
): ExtendedMetaData | undefined {
  return meta as ExtendedMetaData | undefined;
}
