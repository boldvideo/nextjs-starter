"use client";

import { X, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AskCitation } from "@/lib/ask";
import {
  MuxPlayerComponent,
  MuxPlayerVideoLike,
} from "@/components/players/player-mux";
import { getCanonicalVideoPath } from "@/lib/video-path";

interface AskSourcesRailProps {
  citations: AskCitation[];
  displayNumberById?: Map<string, number>;
  selectedCitation: AskCitation | null;
  onSelect: (citation: AskCitation | null) => void;
  isStreaming: boolean;
  className?: string;
}

/**
 * Right-hand sources rail for the Ask page. Shows the current answer's
 * sources as a compact list; selecting one expands the rail into a
 * "Video source" panel with the player at the cited moment, the quote,
 * and the episode's other cited moments.
 */
export function AskSourcesRail({
  citations,
  displayNumberById,
  selectedCitation,
  onSelect,
  isStreaming,
  className,
}: AskSourcesRailProps) {
  const episodeCount = new Set(citations.map((c) => c.videoId)).size;

  if (selectedCitation) {
    return (
      <VideoSourcePanel
        citation={selectedCitation}
        citations={citations}
        onSelect={onSelect}
        onClose={() => onSelect(null)}
        className={className}
      />
    );
  }

  // Group moments by episode, preserving first-appearance order — repeated
  // titles per moment aren't scannable.
  const groups: { videoId: string; title: string; items: AskCitation[] }[] = [];
  const byVideo = new Map<string, (typeof groups)[number]>();
  for (const c of citations) {
    let g = byVideo.get(c.videoId);
    if (!g) {
      g = { videoId: c.videoId, title: c.videoTitle || "Untitled", items: [] };
      byVideo.set(c.videoId, g);
      groups.push(g);
    }
    g.items.push(c);
  }

  return (
    <aside
      className={cn(
        "w-[300px] shrink-0 border-l border-border",
        "flex flex-col min-h-0 overflow-y-auto",
        "px-5 py-8",
        className
      )}
    >
      <h4 className="font-[family-name:var(--font-heading)] font-semibold text-sm tracking-tight mb-1">
        Sources
      </h4>
      <p className="font-mono text-xs text-muted-foreground/70 mb-5">
        {isStreaming && citations.length === 0
          ? "retrieving…"
          : `${citations.length} ${citations.length === 1 ? "moment" : "moments"} · ${episodeCount} ${episodeCount === 1 ? "episode" : "episodes"}`}
      </p>
      <div className="flex flex-col gap-4">
        {groups.map((g) => (
          <div key={g.videoId}>
            <p className="text-[12.5px] font-medium text-muted-foreground leading-snug mb-1.5 line-clamp-2">
              {g.title}
            </p>
            <div className="flex flex-col gap-0.5">
              {g.items.map((c) => {
                const num = displayNumberById?.get(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onSelect(c)}
                    className={cn(
                      "flex items-center gap-2.5 px-2 py-1.5 -ml-2 rounded-md text-left w-full",
                      "cursor-pointer hover:bg-muted transition-colors"
                    )}
                  >
                    <span
                      className={cn(
                        "shrink-0 w-[18px] h-[18px] grid place-items-center rounded",
                        "font-mono text-[10.5px] font-semibold",
                        "text-signal bg-[var(--signal-soft)] border border-[var(--signal-line)]"
                      )}
                    >
                      {num ?? "·"}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground/70">
                      {c.timestampStart}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11.5px] text-muted-foreground/50">
                      {c.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function VideoSourcePanel({
  citation,
  citations,
  onSelect,
  onClose,
  className,
}: {
  citation: AskCitation;
  citations: AskCitation[];
  onSelect: (citation: AskCitation) => void;
  onClose: () => void;
  className?: string;
}) {
  const video: MuxPlayerVideoLike = {
    id: citation.videoId,
    playbackId: citation.playbackId,
    title: citation.videoTitle,
  };
  const startSeconds = Math.floor(citation.startMs / 1000);

  // Other cited moments from the same episode, in playback order.
  const nearby = citations
    .filter((c) => c.videoId === citation.videoId)
    .sort((a, b) => a.startMs - b.startMs);

  return (
    <aside
      className={cn(
        "w-[460px] shrink-0 border-l border-border bg-surface",
        "flex flex-col min-h-0",
        className
      )}
    >
      {/* Head */}
      <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-border shrink-0">
        <h3 className="font-[family-name:var(--font-heading)] font-semibold text-base">
          Video source
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="w-[30px] h-[30px] grid place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-[18px]">
        <div
          key={`${citation.videoId}-${citation.startMs}`}
          className="relative aspect-video rounded-lg overflow-hidden border border-border bg-black mb-4"
        >
          <MuxPlayerComponent
            video={video}
            startTime={startSeconds}
            autoPlay={false}
            className="w-full h-full"
          />
        </div>

        <p className="font-[family-name:var(--font-heading)] font-semibold text-lg leading-snug mb-1">
          {citation.videoTitle}
        </p>
        <p className="font-mono text-sm text-signal mb-3">
          Transcript at {citation.timestampStart}
        </p>
        {citation.text && (
          <blockquote className="border-l-2 border-signal pl-3.5 py-1 text-base leading-relaxed text-muted-foreground italic mb-5">
            &ldquo;{citation.text}&rdquo;
          </blockquote>
        )}

        <Link
          href={`${getCanonicalVideoPath(citation.videoId)}?t=${startSeconds}`}
          className={cn(
            "flex items-center justify-center gap-2 w-full h-[42px] rounded-lg",
            "border border-border bg-muted text-sm font-medium",
            "hover:border-primary/40 transition-colors"
          )}
        >
          <ExternalLink className="h-[15px] w-[15px]" />
          Open full video at {citation.timestampStart}
        </Link>

        {nearby.length > 1 && (
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-xs font-semibold tracking-[0.1em] uppercase text-muted-foreground/70 mb-2">
              Other moments in this episode
            </p>
            {nearby.map((c) => {
              const isHit = c.id === citation.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelect(c)}
                  className="flex gap-2.5 py-[7px] w-full text-left text-sm leading-normal cursor-pointer"
                >
                  <span
                    className={cn(
                      "font-mono shrink-0",
                      isHit ? "text-signal" : "text-muted-foreground/60"
                    )}
                  >
                    {c.timestampStart}
                  </span>
                  <span
                    className={cn(
                      "line-clamp-2",
                      isHit ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {c.text}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
