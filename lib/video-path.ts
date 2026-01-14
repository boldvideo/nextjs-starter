export type VideoPathStyle = "root" | "v";

export function getVideoPathStyle(): VideoPathStyle {
  const style = process.env.NEXT_PUBLIC_VIDEO_PATH_STYLE;
  if (style === "root") return "root";
  return "v";
}

export function getCanonicalVideoPath(identifier: string): string {
  const style = getVideoPathStyle();
  return style === "root" ? `/${identifier}` : `/v/${identifier}`;
}

export function getCanonicalPlaylistVideoPath(
  playlistId: string,
  videoIdentifier: string
): string {
  return `/pl/${playlistId}/v/${videoIdentifier}`;
}

/**
 * Get the video identifier to use in URLs (prefers slug over id)
 */
export function getVideoIdentifier(video: { id: string; slug?: string }): string {
  return video.slug || video.id;
}

/**
 * Build a video URL with optional time parameter
 */
export function buildVideoUrl(
  video: { id: string; slug?: string },
  options?: { time?: number; playlistId?: string }
): string {
  const identifier = getVideoIdentifier(video);
  
  let path: string;
  if (options?.playlistId) {
    path = getCanonicalPlaylistVideoPath(options.playlistId, identifier);
  } else {
    path = getCanonicalVideoPath(identifier);
  }
  
  if (options?.time !== undefined) {
    return `${path}?t=${Math.floor(options.time)}`;
  }
  return path;
}
