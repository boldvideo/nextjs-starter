"use client";

import { useEffect, useState } from "react";
import type { GymClip } from "@/lib/gym-clip-window";

export { clipLength } from "@/lib/gym-clip-window";

/**
 * The coach clip around a cited moment (see lib/gym-clip.ts). Fetched once
 * per moment and shared, so prefetching on render makes play instant.
 */

export interface ClipMoment {
  videoId: string;
  startMs: number;
  endMs?: number;
}

const clips = new Map<string, Promise<GymClip | null>>();

export function fetchGymClip({ videoId, startMs, endMs }: ClipMoment): Promise<GymClip | null> {
  const s = Math.round(startMs);
  const e = Math.round(endMs && endMs > startMs ? endMs : startMs);
  const key = `${videoId}@${s}-${e}`;
  let clip = clips.get(key);
  if (!clip) {
    clip = fetch(`/api/gym/clip?v=${encodeURIComponent(videoId)}&s=${s}&e=${e}`)
      .then((r) => (r.ok ? (r.json() as Promise<GymClip>) : null))
      .catch(() => null);
    clips.set(key, clip);
    clip.then((c) => {
      if (!c) clips.delete(key);
    });
  }
  return clip;
}

/** `undefined` while loading, `null` when there's no clip (play the session). */
export function useGymClip(moment: ClipMoment | null): GymClip | null | undefined {
  const key = moment ? `${moment.videoId}@${moment.startMs}-${moment.endMs ?? ""}` : "";
  const [state, setState] = useState<{ key: string; clip: GymClip | null } | null>(null);

  useEffect(() => {
    if (!moment) return;
    let live = true;
    fetchGymClip(moment).then((clip) => {
      if (live) setState({ key, clip });
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by the moment
  }, [key]);

  if (!moment) return null;
  return state?.key === key ? state.clip : undefined;
}
