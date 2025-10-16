import type { Playlist, Video } from "@boldvideo/bold-js";

/**
 * Calculate the total duration of all videos in a playlist
 * @param videos - Array of videos from a playlist
 * @returns Total duration in seconds
 */
export function calculateTotalDuration(videos: Video[]): number {
  return videos.reduce((sum, video) => sum + (video.duration || 0), 0);
}

/**
 * Find the most recent published_at date from playlist videos
 * @param videos - Array of videos from a playlist
 * @returns Date object of the most recent published_at, or null if no videos
 */
export function getLastUpdatedDate(videos: Video[]): Date | null {
  if (videos.length === 0) return null;

  const dates = videos
    .map(v => v.published_at)
    .filter(Boolean)
    .map(dateStr => new Date(dateStr));

  if (dates.length === 0) return null;

  return new Date(Math.max(...dates.map(d => d.getTime())));
}
