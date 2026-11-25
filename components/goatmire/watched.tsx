"use client";

import { useProgress } from "@/components/providers/progress-provider";

/** Thin bar along the bottom of a thumbnail: how far this viewer got. */
export function Watched({ videoId }: { videoId: string }) {
  const { progressMap } = useProgress();
  const p = progressMap.get(videoId);
  if (!p || (p.percentWatched <= 0 && !p.completed)) return null;
  return (
    <span className="g-watched" aria-label={p.completed ? "Watched" : `${Math.round(p.percentWatched)}% watched`}>
      <i style={{ width: `${p.completed ? 100 : Math.min(p.percentWatched, 100)}%` }} />
    </span>
  );
}

/** "Watched" / "Halfway" in words, for rows without a thumbnail. */
export function WatchedWord({ videoId }: { videoId: string }) {
  const { progressMap } = useProgress();
  const p = progressMap.get(videoId);
  if (!p || p.percentWatched < 3) return null;
  return <span className="g-watchedword">{p.completed ? "Watched" : `${Math.round(p.percentWatched)}% in`}</span>;
}
