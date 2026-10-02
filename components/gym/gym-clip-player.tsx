"use client";

import { useState } from "react";
import { ArrowUpRight, RotateCcw } from "lucide-react";
import { MuxPlayerComponent } from "@/components/players/player-mux";
import type { SourceOpen } from "@/lib/source-engagement";
import { useGymClip, type ClipMoment } from "@/lib/use-gym-clip";
import { track } from "@/lib/gym-track";
import { FOUNDERWELL_PROGRAM_URL } from "@/lib/gym-lead";
import { cn } from "@/lib/utils";

/**
 * Plays the coach's moment, not the whole session: the clip window comes from
 * /api/gym/clip (the thought around the cited sentence, about a minute). When
 * it ends, an end card offers a replay and the full session at FounderWell.
 * Falls back to the session at the cited second only if no clip resolves.
 */
export function GymClipPlayer({
  moment,
  playbackId,
  title,
  engagement,
  autoPlay = true,
  className,
}: {
  moment: ClipMoment;
  playbackId: string;
  title: string;
  engagement?: SourceOpen;
  autoPlay?: boolean;
  className?: string;
}) {
  const clip = useGymClip(moment);
  const [ended, setEnded] = useState(false);
  const [take, setTake] = useState(0);

  if (clip === undefined) {
    return (
      <div className={cn("grid place-items-center bg-black", className)}>
        <span className="font-osd text-[18px] text-[var(--gym-cyan)] gym-blink">LOADING TAPE…</span>
      </div>
    );
  }

  return (
    <div className={cn("relative bg-black", className)}>
      <MuxPlayerComponent
        key={take}
        video={{ id: moment.videoId, playbackId: clip?.playbackId ?? playbackId, title }}
        engagement={engagement}
        clip={clip}
        startTime={clip ? undefined : Math.floor(moment.startMs / 1000)}
        autoPlay={autoPlay}
        onEnded={() => {
          setEnded(true);
          track("Clip ended", { video: title.slice(0, 120) });
        }}
        className="w-full h-full"
      />
      {ended && clip && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-[#0b0618]/88 backdrop-blur-[2px] p-4 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
          <div>
            <p className="font-display text-[15px] sm:text-[18px] gym-sunset-text">That&apos;s the moment</p>
            <p className="mt-1.5 text-[13.5px] sm:text-[14.5px] text-foreground/85 max-w-[34ch] mx-auto">
              The full session lives in FounderWell&apos;s program.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEnded(false);
                  setTake((n) => n + 1);
                }}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-[var(--gym-line)] text-[13px] font-semibold text-foreground/90 hover:border-[var(--gym-cyan)] hover:text-[var(--gym-cyan)] cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                Replay
              </button>
              <a
                href={FOUNDERWELL_PROGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("Full session", { video: title.slice(0, 120) })}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[var(--gym-pink)] text-[13px] font-semibold text-white hover:brightness-110"
              >
                Get the full session
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
