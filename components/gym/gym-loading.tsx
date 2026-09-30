"use client";

import { useEffect, useState } from "react";

const LOADING_LINES = [
  "Loading level…",
  "Blowing on the cartridge…",
  "Finding the secret level…",
  "Scrubbing to the good part…",
  "Consulting the strategy guide…",
  "Counting your extra lives…",
];

/**
 * Arcade "LOADING" line while the game master works. Shows the backend's
 * progress message when there is one, loading-screen lines while there isn't.
 */
export function GymLoading({ status }: { status?: string | null }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (status) return;
    const id = setInterval(() => setI((n) => (n + 1) % LOADING_LINES.length), 1600);
    return () => clearInterval(id);
  }, [status]);

  return (
    <div className="flex flex-col gap-3" role="status" aria-live="polite">
      <div className="flex items-center gap-3 font-osd text-[22px] leading-none">
        <span className="flex items-center gap-1.5 text-[var(--gym-pink)]">
          <span className="gym-rec inline-block h-2.5 w-2.5 bg-[var(--gym-pink)] shadow-[0_0_10px_var(--gym-pink)]" />
          LOADING
        </span>
        <span className="text-foreground/85 truncate">{status || LOADING_LINES[i]}</span>
      </div>
      {/* Progress bar */}
      <div className="relative h-1 w-full max-w-[420px] overflow-hidden rounded-full bg-white/5">
        <div className="absolute inset-y-0 w-1/3 rounded-full gym-sunset-bg motion-safe:animate-[scrub-loading_1.2s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}
