"use client";

import Image from "next/image";
import { AskCitation } from "@/lib/ask";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface AskSourcesCarouselProps {
  citations: AskCitation[];
  onCitationClick: (citation: AskCitation) => void;
  selectedCitationId?: string;
}

function formatTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function AskSourcesCarousel({
  citations,
  onCitationClick,
  selectedCitationId,
}: AskSourcesCarouselProps) {
  // Filter to only show cited sources (those referenced in the answer)
  const citedSources = citations.filter((c) => c.cited !== false);

  if (citedSources.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="srl-eyebrow text-muted-foreground">
          the receipts
        </span>
        <span className="font-mono text-xs text-muted-foreground/70">
          {citedSources.length} moment{citedSources.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Carousel */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        {citedSources.map((citation, index) => {
          const isSelected = selectedCitationId === citation.id;
          const hasValidTimestamp = citation.startMs > 0;
          const thumbnailUrl = citation.playbackId
            ? `https://image.mux.com/${citation.playbackId}/thumbnail.webp?time=${Math.floor(citation.startMs / 1000)}`
            : null;

          return (
            <button
              key={citation.id}
              onClick={() => onCitationClick(citation)}
              className={cn(
                "flex-shrink-0 w-[200px] rounded-xl overflow-hidden text-left transition-all",
                "bg-card border shadow-[0_1px_2px_rgba(22,21,15,0.05)]",
                index % 2 === 0 ? "rotate-[-0.4deg]" : "rotate-[0.4deg]",
                "hover:rotate-0 hover:border-accent",
                isSelected ? "rotate-0 border-accent ring-2 ring-accent/50" : "border-border"
              )}
            >
              <div className="relative aspect-video bg-muted">
                {thumbnailUrl ? (
                  <Image
                    src={thumbnailUrl}
                    alt={citation.videoTitle}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-black">
                    <Play className="h-8 w-8 text-white/50" />
                  </div>
                )}

                {/* Citation number badge - top left */}
                <div className="absolute top-2 left-2 grid h-6 w-6 place-items-center rounded-md border border-[var(--signal-line)] bg-background font-mono text-xs font-semibold text-signal">
                  {index + 1}
                </div>

                {/* Timestamp badge - bottom right (only show if valid) */}
                {hasValidTimestamp && (
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-xs">
                    {formatTime(citation.startMs)}
                  </div>
                )}
              </div>

              {/* Video info below thumbnail */}
              <div className="p-3 space-y-1">
                <h4 className="text-sm font-medium line-clamp-2 leading-tight">
                  {citation.videoTitle}
                </h4>
                <div className="flex items-center gap-1 text-primary">
                  <Play className="h-3 w-3" />
                  {hasValidTimestamp && (
                    <span className="text-xs">{formatTime(citation.startMs)}</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
