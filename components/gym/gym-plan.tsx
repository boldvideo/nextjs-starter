"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { Check, Play, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AskCitation } from "@/lib/ask";
import { PROSE_CLASS } from "@/lib/prose";
import { useSmoothText } from "@/hooks/use-smooth-text";
import { MarkdownSection, stripTrailingCitationList } from "@/components/ask/ask-message-card";
import { MuxPlayerComponent } from "@/components/players/player-mux";
import { SourceOpen, type AnswerInteraction } from "@/lib/source-engagement";

/**
 * An answer, written up the way a fitness coach writes a program:
 *
 *   THE PLAY      the coach's take (intro paragraphs), with its clip
 *   DRILL 01…     each bullet, with the clip that backs it right underneath
 *   TODAY'S SET   the closing action, with log-it + share
 *
 * The persona already answers as "take → ≤3 bullets → one concrete action",
 * so this is a layout over that shape, not a new format. Anything that
 * doesn't fit (no bullets, headings, code) degrades to plain paragraphs.
 */

type Block = { kind: "para"; text: string } | { kind: "item"; text: string };

const ITEM_RE = /^\s*(?:[-*•]|\d+[.)])\s+/;
const REF_RE = /\[(\d+|c_[^\]]+)\]/g;

function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flushPara = () => {
    const text = para.join("\n").trim();
    if (text) blocks.push({ kind: "para", text });
    para = [];
  };

  for (const line of markdown.split("\n")) {
    if (ITEM_RE.test(line)) {
      flushPara();
      blocks.push({ kind: "item", text: line.replace(ITEM_RE, "") });
    } else if (!line.trim()) {
      flushPara();
    } else if (blocks.length && blocks[blocks.length - 1].kind === "item" && !para.length && /^\s{2,}/.test(line)) {
      // Indented continuation of a bullet
      blocks[blocks.length - 1].text += `\n${line.trim()}`;
    } else {
      para.push(line);
    }
  }
  flushPara();
  return blocks;
}

function refsIn(text: string, citations: AskCitation[]): AskCitation[] {
  const seen = new Set<string>();
  const out: AskCitation[] = [];
  for (const m of Array.from(text.matchAll(REF_RE))) {
    const ref = m[1];
    const c = ref.startsWith("c_")
      ? citations.find((x) => x.id === ref)
      : citations[parseInt(ref, 10) - 1];
    if (c && !seen.has(c.id)) {
      seen.add(c.id);
      out.push(c);
    }
  }
  return out;
}

interface GymPlanProps {
  content: string;
  citations: AskCitation[];
  citationDisplayNumberById?: Map<string, number>;
  onCitationClick: (citation: AskCitation) => void;
  isStreaming?: boolean;
  selectedCitationId?: string;
  interaction?: AnswerInteraction;
  shareUrl?: string;
}

export function GymPlan({
  content,
  citations,
  citationDisplayNumberById,
  onCitationClick,
  isStreaming,
  selectedCitationId,
  interaction,
  shareUrl,
}: GymPlanProps) {
  const streaming = !!isStreaming;
  const smoothed = useSmoothText(content, streaming);
  const revealed = streaming ? smoothed : stripTrailingCitationList(content);
  const text = useMemo(
    () => revealed.replace(/[ \t]+(\[(?:\d+|c_[^\]]+)\])/g, "$1"),
    [revealed]
  );

  const { intro, drills, notes, set } = useMemo(() => {
    const blocks = parseBlocks(text);
    const firstItem = blocks.findIndex((b) => b.kind === "item");
    if (firstItem === -1) {
      // No bullets: the take, then the last paragraph as the set (at rest only)
      const paras = blocks.map((b) => b.text);
      const hasSet = !streaming && paras.length >= 2;
      return {
        intro: hasSet ? paras.slice(0, -1) : paras,
        drills: [] as string[],
        notes: [] as string[],
        set: hasSet ? paras[paras.length - 1] : null,
      };
    }
    let lastItem = firstItem;
    blocks.forEach((b, i) => {
      if (b.kind === "item") lastItem = i;
    });
    const after = blocks.slice(lastItem + 1).map((b) => b.text);
    const setText = after.length ? after[after.length - 1] : null;
    return {
      intro: blocks.slice(0, firstItem).map((b) => b.text),
      drills: blocks.slice(firstItem, lastItem + 1).map((b) => b.text),
      notes: after.slice(0, -1),
      set: setText,
    };
  }, [text, streaming]);

  // Each clip appears once, next to the first beat that cites it
  const clipFor = useMemo(() => {
    const shown = new Set<string>();
    const pick = (t: string) => {
      const c = refsIn(t, citations).find((x) => !shown.has(x.id));
      if (c) shown.add(c.id);
      return c ?? null;
    };
    return {
      intro: intro.map(pick),
      drills: drills.map(pick),
      notes: notes.map(pick),
    };
  }, [intro, drills, notes, citations]);

  const section = {
    citations,
    citationDisplayNumberById,
    onCitationClick,
    isStreaming: streaming,
    selectedCitationId,
  };

  // Which block is still growing (gets the caret)
  const tail = set ? "set" : notes.length ? "notes" : drills.length ? `drill-${drills.length - 1}` : "intro";

  return (
    <div className="space-y-5">
      {/* THE PLAY: explain → show the tape → explain */}
      {intro.map((para, i) => {
        const growing = streaming && tail === "intro" && i === intro.length - 1;
        const clip = clipFor.intro[i];
        return (
          <div key={i}>
            <div
              className={cn(
                PROSE_CLASS,
                "prose-p:my-0",
                i === 0 ? "prose-p:text-[20px] prose-p:leading-[1.55] prose-p:text-foreground" : "prose-p:text-[18px] prose-p:text-foreground/85",
                growing && "chat-stream-cursor"
              )}
            >
              <MarkdownSection content={para} {...section} />
            </div>
            {clip && !growing && (
              <GymClip
                citation={clip}
                number={citationDisplayNumberById?.get(clip.id)}
                interaction={interaction}
                label={i === 0 ? "The proof" : undefined}
                className="mt-4"
              />
            )}
          </div>
        );
      })}

      {/* DRILLS */}
      {drills.length > 0 && (
        <ol className="space-y-4">
          {drills.map((d, i) => {
            const clip = clipFor.drills[i];
            const growing = streaming && tail === `drill-${i}`;
            return (
              <li
                key={i}
                className="relative rounded-2xl border border-[var(--gym-line)] bg-[color-mix(in_srgb,var(--gym-panel)_85%,transparent)] p-4 md:p-5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300"
              >
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="font-display text-[13px] uppercase text-[var(--gym-cyan)]">
                    Drill {String(i + 1).padStart(2, "0")}
                  </span>
                  {clip && (
                    <span className="font-osd text-[16px] leading-none text-muted-foreground">
                      ON TAPE ▶ {clip.timestampStart}
                    </span>
                  )}
                </div>
                <div className={cn(PROSE_CLASS, "prose-p:my-0 prose-p:text-[17px]", growing && "chat-stream-cursor")}>
                  <MarkdownSection content={d} {...section} />
                </div>
                {clip && !growing && (
                  <GymClip
                    citation={clip}
                    number={citationDisplayNumberById?.get(clip.id)}
                    interaction={interaction}
                    className="mt-4"
                  />
                )}
              </li>
            );
          })}
        </ol>
      )}

      {notes.map((para, i) => {
        const growing = streaming && tail === "notes" && i === notes.length - 1;
        const clip = clipFor.notes[i];
        return (
          <div key={i}>
            <div className={cn(PROSE_CLASS, "prose-p:my-0 prose-p:text-[18px] prose-p:text-foreground/85", growing && "chat-stream-cursor")}>
              <MarkdownSection content={para} {...section} />
            </div>
            {clip && !growing && (
              <GymClip
                citation={clip}
                number={citationDisplayNumberById?.get(clip.id)}
                interaction={interaction}
                className="mt-4"
              />
            )}
          </div>
        );
      })}

      {/* TODAY'S SET */}
      {set && (
        <GymSet
          streaming={streaming && tail === "set"}
          shareUrl={shareUrl}
        >
          <MarkdownSection content={set} {...section} />
        </GymSet>
      )}
    </div>
  );
}

/** A clip card that turns into the player, right where it sits. */
function GymClip({
  citation,
  number,
  interaction,
  label,
  className,
}: {
  citation: AskCitation;
  number?: number;
  interaction?: AnswerInteraction;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState<SourceOpen | null>(null);
  const seconds = Math.floor(citation.startMs / 1000);
  const thumb = citation.playbackId
    ? `https://image.mux.com/${citation.playbackId}/thumbnail.webp?time=${seconds}&width=720`
    : null;

  if (open && citation.playbackId) {
    return (
      <div className={cn("rounded-xl overflow-hidden border border-[var(--gym-cyan)] shadow-[0_0_32px_-8px_var(--gym-cyan)] bg-black", className)}>
        <div className="relative aspect-video">
          <MuxPlayerComponent
            video={{ id: citation.videoId, playbackId: citation.playbackId, title: citation.videoTitle }}
            engagement={open}
            startTime={seconds}
            autoPlay={true}
            className="w-full h-full"
          />
        </div>
        <div className="flex items-center justify-between gap-3 px-3 py-2 bg-[var(--gym-night-2)]">
          <p className="min-w-0 truncate text-[13px] font-semibold text-foreground/90">{citation.videoTitle}</p>
          <span className="shrink-0 font-osd text-[17px] leading-none text-[var(--gym-cyan)]">▶ {citation.timestampStart}</span>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => interaction && setOpen(new SourceOpen(citation.videoId, interaction))}
      className={cn(
        "group w-full text-left grid grid-cols-[minmax(0,168px)_1fr] sm:grid-cols-[220px_1fr] gap-3 sm:gap-4 items-center",
        "rounded-xl p-2 -m-2 cursor-pointer hover:bg-white/[0.03] transition-colors",
        className
      )}
    >
      <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-[var(--gym-line)] group-hover:border-[var(--gym-cyan)] group-hover:shadow-[0_0_24px_-8px_var(--gym-cyan)] transition-[border-color,box-shadow]">
        {thumb && (
          // Plain img: Mux serves exact-second frames; next/image would proxy each one
          <img src={thumb} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        )}
        <div className="absolute inset-0 gym-scanlines opacity-70" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_50%,rgba(11,6,24,0.88))]" />
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid place-items-center h-10 w-10 rounded-full gym-sunset-bg text-[#1a0616] shadow-[0_0_20px_rgba(255,46,166,0.7)] transition-transform group-hover:scale-110">
            <Play className="h-4 w-4 fill-current translate-x-px" />
          </span>
        </span>
        <span className="absolute left-2 bottom-1 font-osd text-[17px] leading-none text-white [text-shadow:0_0_6px_rgba(34,230,255,0.9)]">
          ▶ {citation.timestampStart}
        </span>
      </div>
      <div className="min-w-0">
        <p className="font-osd text-[16px] leading-none text-[var(--gym-cyan)] uppercase">
          {label ?? "Watch the rep"}{number != null ? ` · ${number}` : ""}
        </p>
        <p className="mt-1.5 text-[14px] font-semibold leading-snug text-foreground line-clamp-2">{citation.videoTitle}</p>
        {citation.text && (
          <p className="mt-1 text-[13px] leading-snug text-muted-foreground line-clamp-2 italic">
            &ldquo;{citation.text.trim()}&rdquo;
          </p>
        )}
      </div>
    </button>
  );
}

/** The closing action, framed as today's set. Log it, share it. */
function GymSet({
  children,
  streaming,
  shareUrl,
}: {
  children: React.ReactNode;
  streaming: boolean;
  shareUrl?: string;
}) {
  const [logged, setLogged] = useState(false);
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = shareUrl || window.location.href;
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ url, title: "My rep at The GTM Gym" });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* dismissed */
    }
  };

  return (
    <div className="gym-neon-frame">
      <div className="rounded-[calc(1.1rem-2px)] bg-[var(--gym-night-2)] p-4 md:p-5">
        <div className="flex items-center gap-2.5 mb-2">
          <Image src="/gym/coach.webp" alt="" width={28} height={28} className="h-7 w-7" />
          <span className="font-display text-[13px] uppercase gym-sunset-text">Today&apos;s set</span>
        </div>
        <div className={cn(PROSE_CLASS, "prose-p:my-0 prose-p:text-[17px] prose-p:text-foreground", streaming && "chat-stream-cursor")}>
          {children}
        </div>
        {!streaming && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setLogged((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg font-display text-[12px] uppercase cursor-pointer transition-[background-color,color,transform] active:scale-95",
                logged ? "bg-[var(--gym-cyan)] text-[#06121a]" : "border border-[var(--gym-line)] text-foreground/90 hover:border-[var(--gym-cyan)] hover:text-[var(--gym-cyan)]"
              )}
            >
              <Check className="h-4 w-4" strokeWidth={3} />
              {logged ? "Rep logged. Hydrate." : "Log the rep"}
            </button>
            <button
              type="button"
              onClick={share}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg font-display text-[12px] uppercase cursor-pointer border border-[var(--gym-line)] text-foreground/90 hover:border-[var(--gym-pink)] hover:text-[var(--gym-pink)] transition-colors active:scale-95"
            >
              <Share2 className="h-4 w-4" />
              {copied ? "Link copied. Recruit a spotter." : "Share this rep"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
