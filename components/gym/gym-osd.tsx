"use client";

import { score6, useArcade } from "@/lib/gym-arcade";

/**
 * The cabinet HUD, kept quiet: your 1UP score (XP from asking, finishing
 * quests, achievements) top-left, and the secret-mode marker once someone
 * has entered the code. INSERT COIN is the email gate now, not a toy.
 */
export function GymOsd() {
  const { xp, secret } = useArcade();

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 max-w-[1440px] mx-auto px-5 md:px-8 pt-4 md:pt-5 flex justify-between items-start font-osd text-[20px] md:text-[22px] leading-none text-white/70 [text-shadow:0_0_8px_rgba(34,230,255,0.5)]">
      <div className="flex items-baseline gap-2" aria-label={`Your score: ${xp}`}>
        <span className="text-[var(--gym-pink)]">1UP</span>
        <span className="tabular-nums">{score6(xp)}</span>
      </div>
      {secret && <span className="text-[var(--gym-yellow)]">SECRET MODE · LIVES ×30</span>}
    </div>
  );
}
