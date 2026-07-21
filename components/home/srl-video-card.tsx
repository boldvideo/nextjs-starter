import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNowStrict } from "date-fns";
import { formatDuration } from "util/format-duration";
import type { Video } from "@boldvideo/bold-js";
import { buildVideoUrl } from "@/lib/video-path";

/**
 * Episode card in the startups.com /videos grammar: 12px-radius
 * thumbnail with a duration chip, then an 800-weight two-line title and
 * a tinted meta row underneath.
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
        <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-muted transition-shadow duration-300 group-hover:shadow-[0_16px_32px_-14px_var(--shadow)]">
          {video.thumbnail ? (
            <Image
              src={video.thumbnail}
              alt=""
              fill
              priority={priority}
              sizes="(max-width: 768px) 78vw, (max-width: 1024px) 46vw, 300px"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <span className="absolute inset-0 bg-muted" aria-hidden="true" />
          )}
          <span className="absolute bottom-2.5 right-2.5 rounded-[5px] bg-black/85 px-1.5 py-0.5 font-heading text-xs font-semibold text-white">
            {formatDuration(video.duration)}
          </span>
        </div>
        <h3 className="mt-3 line-clamp-2 font-heading text-[17px] font-bold leading-[1.45] transition-colors group-hover:text-[var(--accent-active)] lg:text-[18px]">
          {video.title}
        </h3>
        {publishedAgo && (
          <p className="mt-1 text-[13px] font-medium text-muted-foreground">
            {publishedAgo}
          </p>
        )}
      </div>
    </Link>
  );
}
