import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import type { Video } from "@boldvideo/bold-js";
import { buildVideoUrl } from "@/lib/video-path";
import { SrlScrubThumb } from "@/components/home/srl-scrub-thumb";

/**
 * Episode card in the startups.com /videos grammar: 12px-radius
 * thumbnail (hover scrubs through the show via the Mux storyboard),
 * then a semibold title and a tinted age underneath.
 */
export function SrlVideoCard({
  video,
  priority = false,
}: {
  video: Video;
  priority?: boolean;
}) {
  const publishedDate = video.publishedAt ? new Date(video.publishedAt) : null;
  const publishedAgo =
    publishedDate && !isNaN(publishedDate.getTime())
      ? formatDistanceToNowStrict(publishedDate, { addSuffix: true })
      : null;

  return (
    <Link
      href={buildVideoUrl(video)}
      className="group block outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="transition-transform duration-300 ease-out group-hover:-translate-y-1">
        <SrlScrubThumb
          thumbnail={video.thumbnail}
          title={video.title}
          duration={video.duration}
          playbackId={(video as Video & { playbackId?: string }).playbackId}
          priority={priority}
          className="transition-shadow duration-300 group-hover:shadow-[0_16px_32px_-14px_var(--shadow)]"
        />
        <h3 className="mt-4 line-clamp-2 font-heading text-[16px] font-semibold leading-[1.5] tracking-[-0.01em] transition-colors group-hover:text-[var(--accent-active)]">
          {video.title}
        </h3>
        {publishedAgo && (
          <p className="mt-1.5 text-[13px] font-medium text-muted-foreground">
            {publishedAgo}
          </p>
        )}
      </div>
    </Link>
  );
}
