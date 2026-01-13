export type VideoPathStyle = "root" | "v";

export function getVideoPathStyle(): VideoPathStyle {
  const style = process.env.VIDEO_PATH_STYLE;
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
