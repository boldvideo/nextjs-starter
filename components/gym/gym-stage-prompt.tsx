"use client";

import { useState } from "react";
import { setStage, useArcade } from "@/lib/gym-arcade";
import { STAGES } from "@/lib/gym-lead";

/**
 * "Select difficulty", asked at the one moment it costs nothing: while the
 * answer loads. One tap, optional; every answer after it fits the stage.
 */
export function GymStagePrompt() {
  const { stage } = useArcade();
  const [picked, setPicked] = useState<string | null>(null);

  if (picked) {
    return (
      <p className="font-osd text-[18px] text-[var(--gym-cyan)] motion-safe:animate-in motion-safe:fade-in">
        DIFFICULTY: {picked.toUpperCase()}. THE NEXT ANSWERS FIT.
      </p>
    );
  }
  if (stage) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500" role="radiogroup" aria-label="Your stage">
      <span className="text-sm text-muted-foreground mr-1">Quick one while I load: what stage are you at?</span>
      {STAGES.map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={false}
          onClick={() => {
            setStage(s);
            setPicked(s);
          }}
          className="h-8 px-3 rounded-full text-[13px] font-semibold border border-[var(--gym-line)] text-foreground/85 hover:border-[var(--gym-yellow)] hover:text-[var(--gym-yellow)] cursor-pointer"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
