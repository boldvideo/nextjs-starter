"use client";

import { useCallback, useState } from "react";
import { X, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AskCitation } from "@/lib/ask";
import type { MuxPlayerVideoLike } from "@/components/players/player-mux";
import type { SourceOpen } from "@/lib/source-engagement";
import { GymClipPlayer } from "@/components/gym/gym-clip-player";
import { FOUNDERWELL_PROGRAM_URL } from "@/lib/gym-lead";
import { track } from "@/lib/gym-track";
import { GymReceiptCard } from "@/components/gym/gym-receipt-card";

interface FramePreview {
  citation: AskCitation;
  top: number;
  left: number;
}

/**
 * The actual video frame at the cited second, floating beside the hovered
 * moment. Mux serves exact-timestamp thumbnails, so this is free — and for
 * an engineer skimming sources, seeing the frame beats reading the quote.
 */
function MomentFramePreview({ preview }: { preview: FramePreview }) {
  const { citation } = preview;
  if (!citation.playbackId) return null;
  const seconds = Math.floor(citation.startMs / 1000);

  return (
    <div
      className="fixed z-50 pointer-events-none pr-3"
      style={{
        top: preview.top,
        left: preview.left,
        transform: "translate(-100%, -50%)",
      }}
    >
      <div
        key={citation.id}
        className={cn(
          "relative w-[280px] aspect-video rounded-lg overflow-hidden",
          "border border-border bg-black shadow-2xl",
          "origin-right motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-[0.97] motion-safe:duration-150 motion-safe:ease-out"
        )}
      >
        {/* Plain img: transient hover preview, Mux CDN handles resizing */}
        <img
          src={`https://image.mux.com/${citation.playbackId}/thumbnail.webp?time=${seconds}&width=560`}
          alt=""
          width={280}
          height={158}
          className="block w-full h-full object-cover"
        />
        <span className="absolute right-1.5 bottom-1.5 text-[10px] font-medium tabular-nums bg-black/80 text-white px-1 py-0.5 rounded">
          {citation.timestampStart}
        </span>
      </div>
    </div>
  );
}

interface AskSourcesRailProps {
  engagement?: SourceOpen;
  citations: AskCitation[];
  displayNumberById?: Map<string, number>;
  selectedCitation: AskCitation | null;
  onSelect: (citation: AskCitation | null) => void;
  isStreaming: boolean;
  /** How many leading citations the answer text references */
  primaryCount?: number;
  className?: string;
}

/**
 * Right-hand sources rail for the Ask page. Shows the current answer's
 * sources as a compact list; selecting one expands the rail into a
 * "Video source" panel with the player at the cited moment, the quote,
 * and the episode's other cited moments.
 */
export function AskSourcesRail({
  engagement,
  citations,
  displayNumberById,
  selectedCitation,
  onSelect,
  isStreaming,
  primaryCount,
  className,
}: AskSourcesRailProps) {
  const episodeCount = new Set(citations.map((c) => c.videoId)).size;

  const [preview, setPreview] = useState<FramePreview | null>(null);

  const showPreview = useCallback(
    (citation: AskCitation, el: HTMLElement) => {
      // Hover-only affordance — on touch, mouseenter fires on tap and the
      // preview would stick around.
      if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches)
        return;
      const rect = el.getBoundingClientRect();
      setPreview({
        citation,
        top: rect.top + rect.height / 2,
        left: rect.left,
      });
    },
    []
  );
  const hidePreview = useCallback(() => setPreview(null), []);

  if (selectedCitation) {
    return (
      <VideoSourcePanel
        engagement={engagement}
        citation={selectedCitation}
        citations={citations}
        onSelect={onSelect}
        onClose={() => onSelect(null)}
        className={className}
      />
    );
  }

  // Receipts = the moments the answer actually leans on (referenced in the
  // text, numbered first). Leftover retrieval hits go under "More on tape".
  const primary = primaryCount != null ? citations.slice(0, primaryCount) : citations;
  const extras = primaryCount != null ? citations.slice(primaryCount, primaryCount + 6) : [];

  return (
    <aside
      className={cn(
        "w-[340px] shrink-0 border-l border-[var(--gym-line)]",
        "bg-[color-mix(in_srgb,var(--gym-night-2)_70%,transparent)]",
        "flex flex-col min-h-0 overflow-y-auto",
        "px-5 py-7",
        className
      )}
      // Preview position is viewport-fixed — drop it when the rail scrolls
      onScroll={hidePreview}
    >
      <div className="flex items-baseline justify-between mb-5">
        <h4 className="font-display text-lg uppercase gym-sunset-text">The proof</h4>
        <span className="font-osd text-[18px] text-muted-foreground">
          {isStreaming && citations.length === 0
            ? "SEARCHING TAPE…"
            : `${primary.length} ${primary.length === 1 ? "CLIP" : "CLIPS"} · ${episodeCount} ${episodeCount === 1 ? "TAPE" : "TAPES"}`}
        </span>
      </div>

      {isStreaming && citations.length === 0 && (
        <div className="flex flex-col gap-5" aria-hidden>
          {[0, 1].map((i) => (
            <div key={i}>
              <div className="aspect-video rounded-lg bg-white/[0.04] animate-pulse" />
              <div className="mt-2 h-3 w-4/5 rounded bg-white/[0.05] animate-pulse" />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-5">
        {primary.map((c) => (
          <GymReceiptCard
            key={c.id}
            citation={c}
            number={displayNumberById?.get(c.id)}
            onClick={() => onSelect(c)}
            className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300"
          />
        ))}
      </div>

      {extras.length > 0 && (
        <div className="mt-7 pt-5 border-t border-[var(--gym-line)]" onMouseLeave={hidePreview}>
          <p className="font-osd text-[18px] text-muted-foreground mb-2">MORE FROM THE LIBRARY</p>
          <div className="flex flex-col gap-0.5">
            {extras.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c)}
                onMouseEnter={(e) => showPreview(c, e.currentTarget)}
                onMouseLeave={hidePreview}
                onFocus={(e) => showPreview(c, e.currentTarget)}
                onBlur={hidePreview}
                className="flex items-baseline gap-2.5 px-2 py-1.5 -mx-2 rounded-md text-left w-full cursor-pointer hover:bg-white/[0.04] transition-colors"
              >
                <span className="shrink-0 font-osd text-[17px] leading-none text-[var(--gym-cyan)]">
                  {c.timestampStart}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted-foreground">
                  {c.videoTitle}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {preview && <MomentFramePreview preview={preview} />}
    </aside>
  );
}

function VideoSourcePanel({
  engagement,
  citation,
  citations,
  onSelect,
  onClose,
  className,
}: {
  engagement?: SourceOpen;
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

  // Other cited moments from the same episode, in playback order.
  const nearby = citations
    .filter((c) => c.videoId === citation.videoId)
    .sort((a, b) => a.startMs - b.startMs);

  return (
    <aside
      className={cn(
        "w-[460px] shrink-0 border-l border-[var(--gym-line)] bg-[var(--gym-night-2)]",
        "flex flex-col min-h-0",
        className
      )}
    >
      {/* Head */}
      <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-[var(--gym-line)] shrink-0">
        <div className="flex items-baseline gap-3">
          <h3 className="font-display text-base uppercase gym-sunset-text">Instant replay</h3>
          <span className="font-osd text-[18px] text-[var(--gym-cyan)]">▶ {citation.timestampStart}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-[30px] h-[30px] grid place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
          aria-label="Back to the proof"
        >
          <X className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-[18px]">
        <div
          key={`${citation.videoId}-${citation.startMs}`}
          className="relative aspect-video rounded-lg overflow-hidden border border-[var(--gym-cyan)] shadow-[0_0_32px_-8px_var(--gym-cyan)] bg-black mb-4"
        >
          <GymClipPlayer
            moment={{ videoId: citation.videoId, startMs: citation.startMs, endMs: citation.endMs }}
            playbackId={video.playbackId}
            title={video.title}
            engagement={engagement}
            className="w-full h-full"
          />
        </div>

        <p className="font-semibold text-lg leading-snug mb-3">
          {citation.videoTitle}
        </p>
        {citation.text && (
          <blockquote className="border-l-2 border-[var(--gym-cyan)] pl-3.5 py-1 text-base leading-relaxed text-foreground/80 mb-5">
            &ldquo;{citation.text.trim()}&rdquo;
          </blockquote>
        )}

        <a
          href={FOUNDERWELL_PROGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("Full session", { video: citation.videoTitle.slice(0, 120) })}
          className={cn(
            "flex items-center justify-center gap-2 w-full h-[44px] rounded-xl",
            "border border-[var(--gym-line)] bg-white/[0.03] text-sm font-semibold",
            "hover:border-[var(--gym-cyan)] hover:text-[var(--gym-cyan)] transition-colors"
          )}
        >
          The full session lives at FounderWell
          <ArrowUpRight className="h-4 w-4" />
        </a>

        {nearby.length > 1 && (
          <div className="mt-6 pt-4 border-t border-[var(--gym-line)]">
            <p className="font-osd text-[18px] text-muted-foreground mb-2">
              MORE FROM THIS SESSION
            </p>
            {nearby.map((c) => {
              const isHit = c.id === citation.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelect(c)}
                  className="flex items-baseline gap-2.5 py-[7px] w-full text-left text-sm leading-normal cursor-pointer group"
                >
                  <span
                    className={cn(
                      "shrink-0 font-osd text-[18px] leading-none",
                      isHit ? "text-[var(--gym-cyan)]" : "text-muted-foreground/70 group-hover:text-foreground"
                    )}
                  >
                    {c.timestampStart}
                  </span>
                  <span
                    className={cn(
                      "line-clamp-2",
                      isHit ? "text-foreground" : "text-muted-foreground group-hover:text-foreground/90"
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
