"use client";

import { cn } from "@/lib/utils";
import { ACHIEVEMENTS, openDodger, score6, useArcade } from "@/lib/gym-arcade";
import { PixelTrophy } from "./gym-arcade";

/**
 * The trophy case on the player card page: your score, every achievement
 * (locked ones stay mysterious), and the Objection Dodger high scores once
 * you've found the secret level. Per browser, like an arcade machine.
 */
export function GymTrophies() {
  const { xp, achievements, scores, secret } = useArcade();
  const unlocked = ACHIEVEMENTS.filter((a) => achievements[a.id]).length;

  return (
    <section className="max-w-[1080px] mx-auto px-4 md:px-6 pb-16 md:pb-24" aria-labelledby="trophy-case">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <p className="font-osd text-[20px] leading-none text-[var(--gym-cyan)]">
            {unlocked}/{ACHIEVEMENTS.length} UNLOCKED
          </p>
          <h2 id="trophy-case" className="mt-1.5 font-display uppercase text-[26px] md:text-[32px] leading-none text-foreground">
            Trophy case
          </h2>
        </div>
        <p className="font-osd text-[22px] leading-none text-foreground/85">
          <span className="text-[var(--gym-pink)]">1UP</span> <span className="tabular-nums">{score6(xp)}</span>
        </p>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ACHIEVEMENTS.map((a) => {
          const got = !!achievements[a.id];
          return (
            <li
              key={a.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3",
                got
                  ? "border-[color-mix(in_srgb,var(--gym-yellow)_45%,transparent)] bg-[color-mix(in_srgb,var(--gym-panel)_92%,transparent)]"
                  : "border-dashed border-[var(--gym-line)]"
              )}
            >
              <PixelTrophy className={cn("h-9 w-9 shrink-0", !got && "opacity-20 grayscale")} />
              <div className="min-w-0">
                <p className={cn("font-display text-[13px] uppercase leading-tight", got ? "text-foreground" : "text-muted-foreground/60")}>
                  {got ? a.title : "???"}
                </p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">
                  {got ? a.detail : "Keep playing."}
                  {got && a.xp ? <span className="text-[var(--gym-cyan)]"> +{a.xp} XP</span> : null}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {secret && (
        <div className="mt-8 max-w-[420px]">
          <div className="flex items-baseline justify-between">
            <p className="font-osd text-[20px] text-[var(--gym-yellow)]">OBJECTION DODGER · HIGH SCORES</p>
            <button type="button" onClick={openDodger} className="font-osd text-[18px] text-[var(--gym-cyan)] hover:underline cursor-pointer">
              PLAY ▶
            </button>
          </div>
          <ol className="mt-2 font-osd text-[20px] leading-[1.3]">
            {scores.map((s, i) => (
              <li key={`${s.initials}-${i}`} className={cn("flex justify-between", s.house ? "text-foreground/60" : "text-[var(--gym-yellow)]")}>
                <span>{String(i + 1).padStart(2, " ")}. {s.initials}</span>
                <span className="tabular-nums">${s.score.toLocaleString("en-US")}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
