"use client";

import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AskCitation } from "@/lib/ask";
import { ClipLength } from "./gym-clip-player";
import { proofQuote } from "@/lib/gym-plan-parse";

interface GymReceiptCardProps {
  citation: AskCitation;
  number?: number;
  selected?: boolean;
  onClick: () => void;
  className?: string;
}

/**
 * One receipt: the frame at the cited second (Mux serves exact-time
 * thumbnails), a VCR "PLAY 58 SEC" overlay (the clip's length), the session title, and the line
 * the coach is leaning on.
 */
export function GymReceiptCard({
  citation,
  number,
  selected,
  onClick,
  className,
}: GymReceiptCardProps) {
  const seconds = Math.floor(citation.startMs / 1000);
  const thumb = citation.playbackId
    ? `https://image.mux.com/${citation.playbackId}/thumbnail.webp?time=${seconds}&width=560`
    : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full text-left cursor-pointer rounded-xl p-2 -m-2",
        "transition-[background-color,transform] duration-150 ease-out active:scale-[0.985]",
        "hover:bg-white/[0.03]",
        className
      )}
    >
      <div
        className={cn(
          "relative aspect-video rounded-lg overflow-hidden bg-black",
          "border transition-[border-color,box-shadow] duration-200",
          selected
            ? "border-[var(--gym-cyan)] shadow-[0_0_24px_-4px_var(--gym-cyan)]"
            : "border-[var(--gym-line)] group-hover:border-[var(--gym-cyan)] group-hover:shadow-[0_0_24px_-8px_var(--gym-cyan)]"
        )}
      >
        {thumb ? (
          // Plain img: Mux CDN handles sizing, and next/image would proxy every frame
          <img
            src={thumb}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : null}
        <div className="absolute inset-0 gym-scanlines opacity-70" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(11,6,24,0.85))]" />

        {number != null && (
          <span className="absolute top-2 left-2 min-w-6 h-6 px-1.5 grid place-items-center rounded-md bg-[var(--gym-cyan)] text-[#06121a] font-display text-[12px] leading-none shadow-[0_0_12px_rgba(34,230,255,0.6)]">
            {number}
          </span>
        )}

        <span className="absolute left-2.5 bottom-1.5 font-osd text-[20px] leading-none text-white [text-shadow:0_0_6px_rgba(34,230,255,0.9)]">
          PLAY ▶ <ClipLength citation={citation} />
        </span>

        <span className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="grid place-items-center h-11 w-11 rounded-full gym-sunset-bg text-[#1a0616] shadow-[0_0_24px_rgba(255,46,166,0.7)]">
            <Play className="h-5 w-5 fill-current translate-x-px" />
          </span>
        </span>
      </div>

      <p className="mt-2 text-[13.5px] font-semibold leading-snug text-foreground/95 line-clamp-2">
        {citation.videoTitle}
      </p>
      {proofQuote(citation.text) && (
        <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground line-clamp-2">
          &ldquo;{citation.text.trim()}&rdquo;
        </p>
      )}
    </button>
  );
}
