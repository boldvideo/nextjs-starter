"use client";

import { useEffect } from "react";

/**
 * One video at a time: when any player on the page starts, the others pause.
 * Media play events don't bubble, so this listens in the capture phase.
 * Safe to call from several components (pausing is idempotent).
 */
export function useOnePlayer() {
  useEffect(() => {
    const onPlay = (e: Event) => {
      const started = e.target as Element | null;
      if (!started || !("pause" in started)) return;
      document.querySelectorAll<HTMLMediaElement>("mux-player, video").forEach((player) => {
        if (player !== started && !player.contains(started) && !player.paused) player.pause();
      });
    };
    document.addEventListener("play", onPlay, true);
    return () => document.removeEventListener("play", onPlay, true);
  }, []);
}
