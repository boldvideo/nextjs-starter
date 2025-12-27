"use client";

import Image from "next/image";
import { AskCitation } from "@/lib/ask";
import { Play, Video } from "lucide-react";
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
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Video className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {citedSources.length} Video Source{citedSources.length !== 1 ? "s" : ""}
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
                "flex-shrink-0 w-[200px] rounded-lg overflow-hidden text-left transition-all",
                "bg-card border hover:border-primary/50",
                isSelected ? "border-primary ring-2 ring-primary" : "border-border"
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
                <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-background text-primary text-xs font-medium flex items-center justify-center">
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
