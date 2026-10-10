import type { Segment, Settings } from "@boldvideo/bold-js";

export interface PlaybackFields {
  playbackPolicy?: "public" | "signed";
  playbackToken?: string | null;
  storyboardToken?: string | null;
}

export type PlaybackSegment = Segment & PlaybackFields & { thumbnail?: string | null };

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
