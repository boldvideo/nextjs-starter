import type { Settings } from "@boldvideo/bold-js";

/**
 * Extended metadata with additional properties not yet in bold-js SDK
 */
export interface ExtendedMetaData {
  title?: string;
  titleSuffix?: string;
  description?: string;
  image?: string;
  socialGraphImageUrl?: string;
}

/**
 * Helper to cast metadata to extended type
 */
export function asExtendedMetaData(
  meta: Settings["metaData"]
): ExtendedMetaData | undefined {
  return meta as ExtendedMetaData | undefined;
}
