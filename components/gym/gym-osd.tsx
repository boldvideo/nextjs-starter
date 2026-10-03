"use client";

import { cn } from "@/lib/utils";
import { hasDodger, openDodger, score6, useArcade } from "@/lib/gym-arcade";
import { GOLD_RANK, rankOf } from "@/lib/gym-ranks";

/**
 * The cabinet HUD, kept quiet: your 1UP score (XP from asking, finishing
 * quests, achievements) and rank top-left (gold from Rainmaker up), and the
 * secret-mode marker once someone has entered the code or earned the
 * Dodger (on phones, it's the way back into the secret level).
 * INSERT COIN is the email gate now, not a toy.
 */
export function GymOsd() {
  const arcade = useArcade();
  const { xp, secret } = arcade;
  const rank = rankOf(xp);
  const gold = rank.index >= GOLD_RANK;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 max-w-[1440px] mx-auto px-5 md:px-8 pt-4 md:pt-5 flex justify-between items-start font-osd text-[20px] md:text-[22px] leading-none text-white/70 [text-shadow:0_0_8px_rgba(34,230,255,0.5)]">
      <div className={cn("flex items-baseline gap-2 transition-opacity", xp === 0 && "opacity-0", gold && "text-[var(--gym-yellow)] [text-shadow:0_0_10px_var(--gym-yellow)]")} aria-label={`Your score: ${xp}, rank ${rank.name}`}>
        <span className="text-[var(--gym-pink)]">1UP</span>
        <span className="tabular-nums">{score6(xp)}</span>
        <span className={cn("text-[16px] md:text-[18px]", gold ? "text-[var(--gym-yellow)]" : "text-white/50")}>· {rank.name.toUpperCase()}</span>
      </div>
      {hasDodger(arcade) && (
        <>
          {/* Phones: the header has no room, so the way back in lives here */}
          <button
            type="button"
            onClick={openDodger}
            className="md:hidden pointer-events-auto text-[var(--gym-yellow)] hover:text-white cursor-pointer"
          >
            <span className="gym-blink">▶</span> SECRET LEVEL
          </button>
          {secret && <span className="hidden md:inline text-[var(--gym-yellow)]">SECRET MODE · LIVES ×30</span>}
        </>
      )}
    </div>
  );
}
