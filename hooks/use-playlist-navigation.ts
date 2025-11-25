import type { Playlist } from "@boldvideo/bold-js";

export function usePlaylistNavigation(playlist: Playlist | undefined, videoId: string) {
  if (!playlist) {
    return {
      currentIndex: -1,
      hasPrevious: false,
      hasNext: false,
      previous: null,
      next: null,
    };
  }

  const currentIndex = playlist.videos.findIndex((v) => v.id === videoId);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < playlist.videos.length - 1;

  return {
    currentIndex,
    hasPrevious,
    hasNext,
    previous: hasPrevious ? playlist.videos[currentIndex - 1] : null,
    next: hasNext ? playlist.videos[currentIndex + 1] : null,
  };
}
