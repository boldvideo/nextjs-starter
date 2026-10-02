"use client";

import { useEffect, useState } from "react";
import { Check, Gift, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { score6, useArcade } from "@/lib/gym-arcade";
import { nextRank, PRIZE, PRIZE_LIVE, rankOf, rankProgress, RANKS } from "@/lib/gym-ranks";

/**
 * The player's rank: where they are, how far to the next one, and what each
 * rank unlocks. XP lives per browser (lib/gym-arcade), so this is too.
 */

/** Your rank, the bar to the next one, and what it unlocks. */
export function GymRankMeter({ className }: { className?: string }) {
  const { xp } = useArcade();
  const rank = rankOf(xp);
  const next = nextRank(xp);
  const progress = rankProgress(xp);

  return (
    <div className={cn("rounded-xl border border-[var(--gym-line)] bg-[var(--gym-night-2)] p-4 md:p-5", className)}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-osd text-[17px] leading-none text-muted-foreground">
            RANK {rank.index + 1}/{RANKS.length}
          </p>
          <p className="mt-1.5 font-display text-[26px] md:text-[30px] uppercase leading-none gym-sunset-text">{rank.name}</p>
        </div>
        <p className="font-osd text-[22px] leading-none text-foreground/85">
          <span className="text-[var(--gym-pink)]">1UP</span> <span className="tabular-nums">{score6(xp)}</span>
        </p>
      </div>
      {/* Pixel bar: 20 cells */}
      <div className="mt-4 grid grid-cols-20 gap-[3px]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label={next ? `Progress to ${next.name}` : "Top rank"}>
        {Array.from({ length: 20 }, (_, i) => (
          <span key={i} className={cn("h-2.5", i < Math.round(progress * 20) ? "bg-[var(--gym-cyan)] shadow-[0_0_6px_var(--gym-cyan)]" : "bg-white/[0.08]")} />
        ))}
      </div>
      <p className="mt-3 text-[14px] text-muted-foreground">
        {next ? (
          <>
            <span className="font-semibold text-foreground tabular-nums">{(next.xp - xp).toLocaleString("en-US")} XP</span> to{" "}
            <span className="font-semibold text-foreground">{next.name}</span>: unlocks {next.perk}.
          </>
        ) : (
          "Top rank. Nothing left to prove. Do the quests anyway."
        )}
      </p>
    </div>
  );
}

/** Every rank and its perk; the reached ones lit. */
export function GymRankLadder() {
  const { xp } = useArcade();
  const current = rankOf(xp);
  const prize = usePrizePreview();

  return (
    <ol className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
      {RANKS.map((r) => {
        const got = r.index <= current.index;
        const top = r.index === RANKS.length - 1;
        const showPrize = top && prize;
        return (
          <li
            key={r.name}
            className={cn(
              "relative rounded-xl border p-3.5",
              showPrize
                ? "border-[var(--gym-yellow)] bg-[color-mix(in_srgb,var(--gym-yellow)_8%,var(--gym-night-2))] shadow-[0_0_30px_-12px_var(--gym-yellow)]"
                : got
                  ? "border-[color-mix(in_srgb,var(--gym-cyan)_50%,transparent)] bg-[var(--gym-night-2)]"
                  : "border-dashed border-[var(--gym-line)]",
              r.index === current.index && "ring-1 ring-[var(--gym-cyan)]"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-osd text-[16px] leading-none text-muted-foreground tabular-nums">
                {r.xp.toLocaleString("en-US")} XP
              </span>
              {got ? (
                <Check className="h-4 w-4 text-[var(--gym-cyan)]" strokeWidth={3} aria-label="Reached" />
              ) : showPrize ? (
                <Gift className="h-4 w-4 text-[var(--gym-yellow)]" aria-hidden />
              ) : (
                <Lock className="h-3.5 w-3.5 text-muted-foreground/60" aria-label="Locked" />
              )}
            </div>
            <p className={cn("mt-2 font-display text-[15px] uppercase leading-none", got ? "text-foreground" : "text-foreground/70")}>{r.name}</p>
            <p className={cn("mt-2 text-[13px] font-semibold leading-snug", showPrize ? "text-[var(--gym-yellow)]" : "text-[var(--gym-cyan)]")}>
              {showPrize ? PRIZE.title : r.perk}
            </p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">{showPrize ? PRIZE.detail : r.detail}</p>
            {showPrize && !PRIZE_LIVE && (
              <p className="mt-2 font-osd text-[14px] leading-none text-[var(--gym-pink)]">PREVIEW · NOT LIVE</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** The grand prize shows when it's live, or as a preview with ?prize (for the pitch). */
function usePrizePreview(): boolean {
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the URL after hydration
    setPreview(new URLSearchParams(window.location.search).has("prize"));
  }, []);
  return PRIZE_LIVE || preview;
}
