"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { Check, Play, Printer, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AskCitation } from "@/lib/ask";
import { PROSE_CLASS } from "@/lib/prose";
import { useSmoothText } from "@/hooks/use-smooth-text";
import { MarkdownSection, stripTrailingCitationList } from "@/components/ask/ask-message-card";
import { MuxPlayerComponent } from "@/components/players/player-mux";
import { SourceOpen, type AnswerInteraction } from "@/lib/source-engagement";
import { coachLabel, type Coach } from "./gym-coaches-data";
import { useCoachOf } from "./use-coach-map";
import { refsIn, splitPlan } from "@/lib/gym-plan-parse";

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

interface GymPlanProps {
  content: string;
  citations: AskCitation[];
  citationDisplayNumberById?: Map<string, number>;
  onCitationClick: (citation: AskCitation) => void;
  isStreaming?: boolean;
  selectedCitationId?: string;
  interaction?: AnswerInteraction;
  shareUrl?: string;
  /** Printable training-plan sheet for this conversation */
  printUrl?: string;
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
  printUrl,
}: GymPlanProps) {
  const coachOf = useCoachOf();
  const streaming = !!isStreaming;
  const smoothed = useSmoothText(content, streaming);
  const revealed = streaming ? smoothed : stripTrailingCitationList(content);
  const text = useMemo(
    () => revealed.replace(/[ \t]+(\[(?:\d+|c_[^\]]+)\])/g, "$1"),
    [revealed]
  );

  const { intro, drills, notes, set } = useMemo(() => splitPlan(text, streaming), [text, streaming]);

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

  // The coaches whose tape backs this answer, most-cited first
  const coaches = useMemo(() => {
    const counts = new Map<Coach, number>();
    for (const c of [...clipFor.intro, ...clipFor.drills, ...clipFor.notes]) {
      const coach = coachOf(c);
      if (coach) counts.set(coach, (counts.get(coach) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([coach]) => coach);
  }, [clipFor, coachOf]);

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
      {/* Whose tape this is */}
      <div className="flex items-center gap-3">
        <span className="font-display text-[13px] uppercase text-[var(--gym-cyan)] [text-shadow:0_0_12px_rgba(34,230,255,0.6)] whitespace-nowrap">
          Coach&apos;s take
        </span>
        <span className="h-px flex-1 bg-[linear-gradient(90deg,var(--gym-cyan),transparent)] opacity-50" />
        {coaches.length > 0 && (
          <span className="flex items-center gap-2 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
            <span className="flex -space-x-2">
              {coaches.slice(0, 3).map((c) => (
                <Image key={c.slug} src={`/gym/coaches/${c.slug}.webp`} alt="" width={30} height={30} className="h-[30px] w-[30px]" />
              ))}
            </span>
            <span className="font-osd text-[17px] leading-none text-muted-foreground whitespace-nowrap">
              WITH {coaches.slice(0, 2).map((c) => coachLabel(c).toUpperCase()).join(" & ")}
            </span>
          </span>
        )}
      </div>

      {/* The take: explain → show the tape → explain */}
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
                coach={coachOf(clip)}
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
                  {clip && coachOf(clip) && (
                    <span className="font-osd text-[16px] leading-none text-muted-foreground">
                      WITH {coachLabel(coachOf(clip)!).toUpperCase()}
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
                    coach={coachOf(clip)}
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
                coach={coachOf(clip)}
                className="mt-4"
              />
            )}
          </div>
        );
      })}

      {/* YOUR WORKOUT */}
      {set && (
        <GymSet
          streaming={streaming && tail === "set"}
          shareUrl={shareUrl}
          printUrl={printUrl}
          coach={coaches[0] ?? null}
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
  coach,
  className,
}: {
  citation: AskCitation;
  number?: number;
  interaction?: AnswerInteraction;
  label?: string;
  coach?: Coach | null;
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
        <p className="flex items-center gap-1.5 font-osd text-[16px] leading-none text-[var(--gym-cyan)] uppercase">
          {coach && (
            <Image src={`/gym/coaches/${coach.slug}.webp`} alt="" width={22} height={22} className="h-[22px] w-[22px] -my-1" />
          )}
          {coach ? `${coachLabel(coach)} · ` : ""}
          {label ?? "Watch the clip"}
          {number != null ? ` · ${number}` : ""}
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

/** The closing action as this week's workout. Do it, share it, print it. */
function GymSet({
  children,
  streaming,
  shareUrl,
  printUrl,
  coach,
}: {
  children: React.ReactNode;
  streaming: boolean;
  shareUrl?: string;
  printUrl?: string;
  coach: Coach | null;
}) {
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = shareUrl || window.location.href;
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ url, title: "My workout from The GTM Gym" });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* dismissed */
    }
  };

  const button =
    "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg font-display text-[12px] uppercase cursor-pointer transition-[background-color,color,border-color,transform] active:scale-95";

  return (
    <div className="gym-neon-frame">
      <div className="rounded-[calc(1.1rem-2px)] bg-[var(--gym-night-2)] p-4 md:p-5">
        <div className="flex items-center gap-2.5 mb-2">
          <Image
            src={coach ? `/gym/coaches/${coach.slug}.webp` : "/gym/coach.webp"}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8"
          />
          <span className="font-display text-[13px] uppercase gym-sunset-text">This week&apos;s workout</span>
          {coach && (
            <span className="ml-auto font-osd text-[16px] leading-none text-muted-foreground">
              — {coachLabel(coach).toUpperCase()}
            </span>
          )}
        </div>
        <div className={cn(PROSE_CLASS, "prose-p:my-0 prose-p:text-[17px] prose-p:text-foreground", streaming && "chat-stream-cursor")}>
          {children}
        </div>
        {!streaming && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setDone((v) => !v)}
              className={cn(
                button,
                done
                  ? "bg-[var(--gym-cyan)] text-[#06121a]"
                  : "border border-[var(--gym-line)] text-foreground/90 hover:border-[var(--gym-cyan)] hover:text-[var(--gym-cyan)]"
              )}
            >
              <Check className="h-4 w-4" strokeWidth={3} />
              {done ? "Done. Now hydrate." : "I did it"}
            </button>
            <button
              type="button"
              onClick={share}
              className={cn(button, "border border-[var(--gym-line)] text-foreground/90 hover:border-[var(--gym-pink)] hover:text-[var(--gym-pink)]")}
            >
              <Share2 className="h-4 w-4" />
              {copied ? "Link copied. Recruit a spotter." : "Share"}
            </button>
            {printUrl && (
              <a
                href={printUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(button, "border border-[var(--gym-line)] text-foreground/90 hover:border-[var(--gym-yellow)] hover:text-[var(--gym-yellow)]")}
              >
                <Printer className="h-4 w-4" />
                Print the plan
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
