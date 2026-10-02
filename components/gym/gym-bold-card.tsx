"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { track } from "@/lib/gym-track";

const DISMISSED = "gym-bold-card-dismissed";

/**
 * Bold's one pitch inside a game, after the player has seen it work twice.
 * It counts the work behind the answer above it ("5 moments from 3 sessions,
 * picked for your question"), which reads well for any library size.
 * Goes to /built-by-bold (Bold's own form and consent). Dismissed for good.
 */
export function GymBoldCard({ moments, sessions }: { moments: number; sessions: number }) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISSED)) return;
    } catch {
      /* storage blocked: show it */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading storage on mount
    setHidden(false);
  }, []);

  if (hidden) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISSED, "1");
    } catch {
      /* fine */
    }
  };

  return (
    <aside className="gym-pixel-box [--c:var(--gym-yellow)] relative bg-[var(--gym-night-2)] p-5 md:p-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 cursor-pointer"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="font-osd text-[17px] leading-none text-[var(--gym-yellow)]">INSERT COIN · PLAYER 2</p>
      <p className="mt-3 pr-8 text-[19px] md:text-[21px] font-semibold leading-snug text-foreground">
        {moments > 0
          ? `${moments} ${moments === 1 ? "moment" : "moments"} from ${sessions} ${sessions === 1 ? "session" : "sessions"}, picked for your question.`
          : "Every answer here comes from FounderWell's own sessions, clip included."}
      </p>
      <p className="mt-1.5 text-[15px] leading-relaxed text-foreground/75 max-w-[52ch]">
        That&apos;s what Bold does with a video library. Got one? Courses, coaching calls, a channel: every answer backed by your own clips.
      </p>
      <Link
        href="/built-by-bold"
        onClick={() => track("Bold card")}
        className="mt-4 inline-flex items-center h-10 px-4 rounded-xl font-display text-[13px] uppercase text-[#1a0616] bg-[var(--gym-yellow)] hover:brightness-110"
      >
        Build one for my videos
      </Link>
    </aside>
  );
}
