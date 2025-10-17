import { VideoLoadingSkeleton } from "@/components/ui/video-loading-skeleton";

export default function PlaylistVideoLoading() {
  return <VideoLoadingSkeleton hasPlaylist={true} />;
}
