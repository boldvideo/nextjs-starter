"use client";

import Image from "next/image";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { sfx, useArcade } from "@/lib/gym-arcade";
import type { Tone } from "./gym-coaches-data";

/** The interactive bits of coach select: hover blips, stat bars, the secret slot. */

const FILL: Record<Tone, string> = {
  pink: "bg-[var(--gym-pink)]",
  cyan: "bg-[var(--gym-cyan)]",
  orange: "bg-[var(--gym-orange)]",
  yellow: "bg-[var(--gym-yellow)]",
  violet: "bg-[#b58cff]",
};

export function GymSelectCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <article onMouseEnter={() => sfx("select")} className={className}>
      {children}
    </article>
  );
}

export function StatBar({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="font-osd text-[15px] leading-none uppercase text-muted-foreground truncate">{label}</span>
      <span className="flex gap-[3px] shrink-0" aria-label={`${value} of 5`}>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={cn("h-2 w-2.5", i < value ? FILL[tone] : "bg-white/10")} />
        ))}
      </span>
    </div>
  );
}

/** The hidden character. Locked until ↑↑↓↓←→←→BA. */
export function GymSecretCoach() {
  const { secret } = useArcade();

  return (
    <div
      className={cn(
        "mt-4 rounded-2xl border p-4 md:p-5 flex items-center gap-4 md:gap-6 transition-colors",
        secret
          ? "border-[var(--gym-yellow)] bg-[color-mix(in_srgb,var(--gym-panel)_92%,transparent)] shadow-[0_0_40px_-14px_var(--gym-yellow)]"
          : "border-dashed border-[var(--gym-line)] bg-transparent"
      )}
    >
      {secret ? (
        <>
          <Image src="/gym/game/master.webp" alt="The Game Master" width={120} height={120} className="h-20 w-20 md:h-24 md:w-24 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-osd text-[17px] leading-none text-[var(--gym-yellow)]">SECRET CHARACTER UNLOCKED</p>
            <h3 className="mt-1.5 font-display text-[17px] md:text-[20px] uppercase leading-tight">The Game Master</h3>
            <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground max-w-[62ch]">
              The AI host. Has watched every minute of every session, never sleeps, never gloats, and always shows you the tape.
            </p>
          </div>
          <div className="hidden md:block w-[220px] space-y-1.5 shrink-0">
            <StatBar label="Recall" value={5} tone="yellow" />
            <StatBar label="Citations" value={5} tone="yellow" />
            <StatBar label="Trash talk" value={0} tone="yellow" />
          </div>
        </>
      ) : (
        <>
          <span className="h-20 w-20 md:h-24 md:w-24 shrink-0 rounded-full border-2 border-dashed border-[var(--gym-line)] grid place-items-center font-display text-[28px] text-muted-foreground/50">
            ?
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-osd text-[17px] leading-none text-muted-foreground">
              <Lock className="h-3.5 w-3.5" /> LOCKED
            </p>
            <h3 className="mt-1.5 font-display text-[17px] md:text-[20px] uppercase leading-tight text-foreground/50">???</h3>
            <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground/70">
              There&apos;s one more player on staff. You know the code. Everybody knows the code.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
