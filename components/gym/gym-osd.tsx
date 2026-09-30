"use client";

import { HOUSE_HI_SCORE, insertCoin, score6, useArcade } from "@/lib/gym-arcade";

/**
 * The cabinet HUD framing the hero: your 1UP score (XP from asking,
 * finishing quests, achievements), the house HI-SCORE, and a blinking
 * INSERT COIN that actually takes coins. It's free play; the coins are
 * for the achievement.
 */
export function GymOsd() {
  const { xp, credits, secret } = useArcade();
  const hi = Math.max(HOUSE_HI_SCORE, xp);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 max-w-[1440px] mx-auto px-5 md:px-8 pt-4 md:pt-5 flex justify-between sm:grid sm:grid-cols-[1fr_auto_1fr] items-start font-osd text-[22px] md:text-[26px] leading-none text-white/85 [text-shadow:0_0_8px_rgba(34,230,255,0.6)]">
      <div className="flex flex-col gap-1" aria-label={`Your score: ${xp}`}>
        <span className="text-[var(--gym-pink)] [text-shadow:0_0_8px_rgba(255,46,166,0.7)]">1UP</span>
        <span className="tabular-nums">{score6(xp)}</span>
      </div>

      <div className="hidden sm:flex flex-col items-center gap-1" aria-hidden>
        <span className="text-[var(--gym-yellow)] [text-shadow:0_0_8px_rgba(255,210,63,0.6)]">HI-SCORE</span>
        <span className="tabular-nums">{score6(hi)}</span>
      </div>

      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={insertCoin}
          className="pointer-events-auto gym-blink hover:text-[var(--gym-yellow)] cursor-pointer"
          aria-label="Insert coin"
        >
          INSERT COIN
        </button>
        <span className="text-[18px] md:text-[20px] text-white/55">
          {secret ? "LIVES ×30" : credits > 0 ? `CREDITS ${String(credits).padStart(2, "0")}` : "FREE PLAY"}
        </span>
      </div>
    </div>
  );
}
