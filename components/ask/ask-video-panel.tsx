"use client";

import { useEffect } from "react";
import { X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { AskCitation } from "@/lib/ask";
import type { MuxPlayerVideoLike } from "@/components/players/player-mux";
import type { SourceOpen } from "@/lib/source-engagement";
import { ClipLength, GymClipPlayer } from "@/components/gym/gym-clip-player";
import { FOUNDERWELL_PROGRAM_URL } from "@/lib/gym-lead";
import { track } from "@/lib/gym-track";

interface AskVideoPanelProps {
  engagement?: SourceOpen;
  citation: AskCitation | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AskVideoPanel({ citation, isOpen, onClose, engagement }: AskVideoPanelProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !citation) return null;

  const video: MuxPlayerVideoLike = {
    id: citation.videoId,
    playbackId: citation.playbackId,
    title: citation.videoTitle,
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[rgba(6,3,14,0.72)] backdrop-blur-sm z-40 lg:hidden animate-in fade-in"
        onClick={onClose}
      />

      {/* Bottom sheet: instant replay */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] rounded-t-2xl",
          "bg-[var(--gym-night-2)] border-t border-[var(--gym-cyan)]",
          "shadow-[0_-12px_60px_-12px_rgba(34,230,255,0.5)]",
          "animate-in slide-in-from-bottom duration-300 ease-out",
          "flex flex-col overflow-hidden"
        )}
        role="dialog"
        aria-label="Instant replay"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/20" />
        <div className="flex items-center justify-between px-4 pt-2 pb-3">
          <div className="flex items-baseline gap-3">
            <h3 className="font-display text-base uppercase gym-sunset-text">Instant replay</h3>
            <span className="font-osd text-[19px] text-[var(--gym-cyan)]">▶ <ClipLength citation={citation} /></span>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="aspect-video bg-black flex-shrink-0">
          <GymClipPlayer
            moment={{ videoId: citation.videoId, startMs: citation.startMs, endMs: citation.endMs }}
            playbackId={video.playbackId}
            title={video.title}
            engagement={engagement}
            className="w-full h-full"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <h2 className="text-lg font-semibold leading-snug mb-3">{citation.videoTitle}</h2>
          {citation.text && (
            <blockquote className="border-l-2 border-[var(--gym-cyan)] pl-3.5 text-foreground/80 leading-relaxed line-clamp-5">
              &ldquo;{citation.text.trim()}&rdquo;
            </blockquote>
          )}
          <a
            href={FOUNDERWELL_PROGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("Full session", { video: citation.videoTitle.slice(0, 120) })}
            className="mt-5 w-full flex items-center justify-center gap-2 h-12 rounded-xl border border-[var(--gym-line)] bg-white/[0.03] hover:border-[var(--gym-cyan)] hover:text-[var(--gym-cyan)] transition-colors text-sm font-semibold"
          >
            The full session lives at FounderWell
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </>
  );
}
