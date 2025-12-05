"use client";

import Image from "next/image";
import { AskCitation } from "@/lib/ask";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface AskVideosTabProps {
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

export function AskVideosTab({
  citations,
  onCitationClick,
  selectedCitationId,
}: AskVideosTabProps) {
  if (citations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>No video sources yet. Ask a question to see related videos.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6">
        <p className="text-sm text-muted-foreground mb-4">
          {citations.length} video source{citations.length !== 1 ? "s" : ""} found
        </p>
        <div className="space-y-3">
          {citations.map((citation) => {
            const isSelected = selectedCitationId === citation.id;
            const thumbnailUrl = citation.playback_id
              ? `https://image.mux.com/${citation.playback_id}/thumbnail.webp?time=${Math.floor(citation.start_ms / 1000)}`
              : null;

            return (
              <button
                key={citation.id}
                onClick={() => onCitationClick(citation)}
                className={cn(
                  "w-full flex gap-4 p-3 rounded-lg text-left transition-colors",
                  "border hover:bg-muted/50",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-border"
                )}
              >
                <div className="relative flex-shrink-0 w-32 aspect-video bg-muted rounded-md overflow-hidden">
                  {thumbnailUrl ? (
                    <Image
                      src={thumbnailUrl}
                      alt={citation.video_title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                    {formatTime(citation.start_ms)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm line-clamp-1 mb-1">
                    {citation.video_title}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    {citation.speaker} • {formatTime(citation.start_ms)} -{" "}
                    {formatTime(citation.end_ms)}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {citation.text || citation.transcript_excerpt}
                  </p>
                </div>

                {citation.relevance_rank && (
                  <div className="flex-shrink-0">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium",
                        citation.relevance_rank === 1
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {citation.relevance_rank}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
