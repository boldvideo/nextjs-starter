"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDuration } from "util/format-duration";
import { buildVideoUrl } from "@/lib/video-path";
import { useSettings } from "@/components/providers/settings-provider";
import { getTenantId } from "@/lib/progress/tenant";
import { getAllProgress, isIndexedDBDefined } from "@/lib/progress/store";
import type { Video } from "@boldvideo/bold-js";

interface ContinueWatchingProps {
  /** Videos to resolve local progress records against (e.g. the homepage list). */
  videos: Video[];
}

/**
 * "Continue watching" rail fed by local (IndexedDB) playback progress:
 * started-but-unfinished videos, most recently watched first, deep-linked
 * to the resume position. Renders nothing when there is no local progress,
 * so it is safe to mount unconditionally.
 */
export function ContinueWatching({ videos }: ContinueWatchingProps) {
  const settings = useSettings();
  const [records, setRecords] = useState<
    { videoId: string; position: number; fraction: number; lastWatched: string }[]
  >([]);

  useEffect(() => {
    if (!isIndexedDBDefined()) return;
    const tenantId = getTenantId(settings);
    if (!tenantId) return;
    let cancelled = false;
    getAllProgress(tenantId)
      .then((all) => {
        if (cancelled) return;
        const resume: typeof records = [];
        for (const r of all) {
          if (r.duration > 0) {
            const fraction = Math.min(1, r.furthestPosition / r.duration);
            if (!r.completed && fraction > 0.01 && r.position > 15) {
              resume.push({
                videoId: r.videoId,
                position: Math.floor(r.position),
                fraction,
                lastWatched: r.lastWatched,
              });
            }
          }
        }
        resume.sort((a, b) => b.lastWatched.localeCompare(a.lastWatched));
        setRecords(resume.slice(0, 8));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [settings]);

  // Progress records only carry ids — resolve against the loaded videos.
  const items = useMemo(
    () =>
      records
        .map((r) => ({ ...r, video: videos.find((v) => v.id === r.videoId) }))
        .filter((r): r is typeof r & { video: Video } => !!r.video)
        .slice(0, 6),
    [records, videos]
  );

  if (items.length === 0) return null;

  return (
    <section className="mb-10">
      <p className="text-xs font-semibold tracking-[0.1em] uppercase text-muted-foreground/70 mb-3">
        Continue watching
      </p>
      <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x">
        {items.map(({ video, position, fraction }) => (
          <Link
            key={video.id}
            href={buildVideoUrl(video, { time: position })}
            className="group snap-start shrink-0 w-[220px]"
          >
            <div className="relative aspect-video rounded-lg overflow-hidden border border-foreground/10 bg-black">
              {video.thumbnail && (
                <Image
                  src={video.thumbnail}
                  alt={video.title}
                  fill
                  sizes="220px"
                  className="object-cover"
                />
              )}
              {video.duration > position && (
                <span className="absolute right-1.5 bottom-1.5 text-[10px] font-medium tabular-nums bg-black/80 text-white px-1 py-0.5 rounded">
                  {formatDuration(video.duration - position)} left
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/20">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.min(100, fraction * 100)}%` }}
                />
              </div>
            </div>
            <p className="mt-2 text-sm font-medium leading-snug line-clamp-1 group-hover:text-primary transition-colors duration-150">
              {video.title}
            </p>
            <p className="text-[11px] tabular-nums text-muted-foreground/70 mt-0.5">
              Resume at {formatDuration(position)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
