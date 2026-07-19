import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNowStrict } from "date-fns";
import { formatDuration } from "util/format-duration";
import type { Video } from "@boldvideo/bold-js";
import { buildVideoUrl } from "@/lib/video-path";

/**
 * Lean video card for the homepage strip: real thumbnail, duration badge,
 * title, age. The whole card is the link.
 */
export function TakiVideoCard({
  video,
  priority = false,
}: {
  video: Video;
  priority?: boolean;
}) {
  return (
    <Link
      href={buildVideoUrl(video)}
      className="group block outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="transition-transform duration-300 ease-out group-hover:-translate-y-1.5 group-hover:rotate-[-0.5deg]">
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-muted shadow-[0_1px_2px_rgba(22,21,15,0.06)] transition-shadow duration-300 group-hover:shadow-[0_18px_36px_-12px_rgba(22,21,15,0.28)]">
          <Image
            src={video.thumbnail}
            alt=""
            fill
            priority={priority}
            sizes="(max-width: 768px) 76vw, (max-width: 1024px) 45vw, 300px"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
          <span className="absolute bottom-2.5 right-2.5 rounded-md bg-black/85 px-1.5 py-0.5 font-mono text-xs font-medium text-white">
            {formatDuration(video.duration)}
          </span>
        </div>
        <h3 className="mt-3 line-clamp-2 text-[15px] font-semibold leading-snug decoration-accent decoration-[3px] underline-offset-4 group-hover:underline">
          {video.title}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatDistanceToNowStrict(new Date(video.publishedAt), {
            addSuffix: true,
          })}
        </p>
      </div>
    </Link>
  );
}
