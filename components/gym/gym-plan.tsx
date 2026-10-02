"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { BookOpen, Check, Copy, Play, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AskCitation } from "@/lib/ask";
import { PROSE_CLASS } from "@/lib/prose";
import { useSmoothText } from "@/hooks/use-smooth-text";
import { MarkdownSection, stripTrailingCitationList } from "@/components/ask/ask-message-card";
import { GymClipPlayer } from "./gym-clip-player";
import { clipLabel, useGymClip } from "@/lib/use-gym-clip";
import { SourceOpen, type AnswerInteraction } from "@/lib/source-engagement";
import { coachLabel, type Coach } from "./gym-coaches-data";
import { useCoachOf } from "./use-coach-map";
import { parseDetour, parseMove, proofQuote, refsIn, splitPlan, stripDetourMarker, stripStepLabel, type Detour } from "@/lib/gym-plan-parse";
import { addXp, sfx, unlock } from "@/lib/gym-arcade";
import { track } from "@/lib/gym-track";

/**
 * An answer, laid out as a game plan:
 *
 *   COACH'S TAKE     the take (intro paragraphs), with its clip
 *   MOVE 01…         each bullet, with the clip that backs it right underneath
 *   YOUR NEXT QUEST  the closing action, with quest-complete + share + print
 *
 * Prompt v2 answers as "take → named moves (with the words to use) → Next step:",
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
  /** The printable Playbook for this conversation */
  printUrl?: string;
  /** Ask one of the suggested questions (wrong-cabinet and thin answers) */
  onAsk?: (question: string) => void;
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
  onAsk,
}: GymPlanProps) {
  const coachOf = useCoachOf();
  const streaming = !!isStreaming;
  const smoothed = useSmoothText(content, streaming);
  const revealed = streaming ? smoothed : stripTrailingCitationList(content);
  const text = useMemo(
    () => revealed.replace(/[ \t]+(\[(?:\d+|c_[^\]]+)\])/g, "$1"),
    [revealed]
  );

  const detour = useMemo(() => parseDetour(text, streaming), [text, streaming]);
  const { intro, drills, notes, set } = useMemo(
    () => splitPlan(stripDetourMarker(text), streaming),
    [text, streaming]
  );

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

  // The lead coach is named once in the header; clips only repeat a coach
  // when it's someone else.
  const lead = coaches[0] ?? null;
  const clipCoach = (c: AskCitation | null) => {
    const coach = coachOf(c);
    return coach && coach !== lead ? coach : null;
  };
  // Guest sessions (no coach on the roster) are labeled, never credited to
  // the lead coach
  const shownClips = [...clipFor.intro, ...clipFor.drills, ...clipFor.notes].filter((c): c is AskCitation => !!c);
  const hasGuest = shownClips.some((c) => !coachOf(c));
  const guestLabel = (c: AskCitation | null) => (c && !coachOf(c) ? "Guest session" : undefined);

  if (detour) {
    const clip = refsIn(detour.text, citations)[0] ?? null;
    return (
      <GymDetour
        detour={detour}
        streaming={streaming}
        onAsk={onAsk}
        lead={
          detour.text && (
            <div className={cn(PROSE_CLASS, "prose-p:my-0 max-w-[62ch] prose-p:text-[19px] prose-p:leading-[1.6] prose-p:text-foreground", streaming && "chat-stream-cursor")}>
              <MarkdownSection content={detour.text} {...section} />
            </div>
          )
        }
        clip={
          clip && !streaming ? (
            <GymClip
              citation={clip}
              number={citationDisplayNumberById?.get(clip.id)}
              interaction={interaction}
              coach={coachOf(clip)}
              label={coachOf(clip) ? undefined : "Guest session"}
              className="mt-5"
            />
          ) : null
        }
      />
    );
  }

  return (
    <div>
      {/* Whose tape this is: the only place the coach is named up front */}
      <div className="flex items-center gap-3 mb-6">
        {coaches.length > 0 ? (
          <span className="flex items-center gap-2.5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
            <span className="flex -space-x-2">
              {coaches.slice(0, 3).map((c) => (
                <Image key={c.slug} src={`/gym/game/cast/${c.slug}.webp`} alt="" width={32} height={32} className="h-8 w-8" />
              ))}
            </span>
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{coaches.slice(0, 2).map(coachLabel).join(" & ")}</span>
              {hasGuest ? " & a guest's take" : "'s take"}
            </span>
          </span>
        ) : (
          <span className="text-sm font-semibold text-muted-foreground">{hasGuest ? "A guest's take" : "Coach's take"}</span>
        )}
      </div>

      {/* The take: explain → show the tape → explain */}
      <div className="space-y-7">
        {intro.map((para, i) => {
          const growing = streaming && tail === "intro" && i === intro.length - 1;
          const clip = clipFor.intro[i];
          return (
            <div key={i}>
              <div
                className={cn(
                  PROSE_CLASS,
                  "prose-p:my-0 max-w-[62ch]",
                  i === 0
                    ? "prose-p:text-[21px] prose-p:leading-[1.55] prose-p:text-foreground prose-p:font-medium"
                    : "prose-p:text-[18px] prose-p:leading-[1.75] prose-p:text-foreground/80",
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
                  coach={clipCoach(clip)}
                  label={guestLabel(clip)}
                  className="mt-5"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Moves: an open, numbered timeline (no boxes) */}
      {drills.length > 0 && (
        <ol className="mt-12 relative">
          {drills.map((d, i) => {
            const clip = clipFor.drills[i];
            const growing = streaming && tail === `drill-${i}`;
            const last = i === drills.length - 1;
            return (
              <li
                key={i}
                className="relative grid grid-cols-[48px_1fr] md:grid-cols-[64px_1fr] gap-x-3 md:gap-x-4 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
              >
                {/* Number + the rail connecting moves */}
                <div className="flex flex-col items-center">
                  <span className="font-display text-[26px] md:text-[32px] leading-none text-transparent [-webkit-text-stroke:1.5px_var(--gym-cyan)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {!last && <span className="mt-3 w-px flex-1 bg-[var(--gym-line)]" />}
                </div>
                <div className={cn("min-w-0", last ? "pb-2" : "pb-11")}>
                  <GymMove text={d} growing={growing} section={section} />
                  {clip && !growing && (
                    <GymClip
                      citation={clip}
                      number={citationDisplayNumberById?.get(clip.id)}
                      interaction={interaction}
                      coach={clipCoach(clip)}
                      label={guestLabel(clip)}
                      className="mt-5"
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {notes.length > 0 && (
        <div className="mt-10 space-y-7">
          {notes.map((para, i) => {
            const growing = streaming && tail === "notes" && i === notes.length - 1;
            const clip = clipFor.notes[i];
            return (
              <div key={i}>
                <div className={cn(PROSE_CLASS, "prose-p:my-0 max-w-[62ch] prose-p:text-[18px] prose-p:leading-[1.75] prose-p:text-foreground/80", growing && "chat-stream-cursor")}>
                  <MarkdownSection content={para} {...section} />
                </div>
                {clip && !growing && (
                  <GymClip
                    citation={clip}
                    number={citationDisplayNumberById?.get(clip.id)}
                    interaction={interaction}
                    coach={clipCoach(clip)}
                    label={guestLabel(clip)}
                    className="mt-5"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* YOUR NEXT QUEST: the one loud element in the answer */}
      {set && (
        <div className="mt-12">
        <GymSet
          streaming={streaming && tail === "set"}
          shareUrl={shareUrl}
          printUrl={printUrl}
          coach={coaches[0] ?? null}
        >
          <MarkdownSection content={stripStepLabel(set)} {...section} />
        </GymSet>
        </div>
      )}
    </div>
  );
}

/**
 * Questions the library can't answer, as a screen instead of a stretched
 * answer: the honest line, at most one clip (the closest thing the sessions
 * say), and three go-to-market questions to play instead.
 */
function GymDetour({
  detour,
  lead,
  clip,
  streaming,
  onAsk,
}: {
  detour: Detour;
  lead: React.ReactNode;
  clip: React.ReactNode;
  streaming: boolean;
  onAsk?: (question: string) => void;
}) {
  return (
    <div className="gym-pixel-box [--c:var(--gym-pink)] relative overflow-hidden bg-[var(--gym-night-2)] p-5 md:p-7">
      <div className="gym-scanlines pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="relative flex items-start gap-4">
        <Image src="/gym/game/game-master-bot.webp" alt="" width={72} height={72} className="h-14 w-14 md:h-[72px] md:w-[72px] shrink-0" />
        <div className="min-w-0">
          <p className="font-display text-[26px] md:text-[34px] leading-none gym-sunset-text">Wrong cabinet</p>
          <div className="mt-3">{lead}</div>
        </div>
      </div>
      {clip && <div className="relative">{clip}</div>}

      {detour.questions.length > 0 && !streaming && (
        <div className="relative mt-7">
          <p className="font-osd text-[17px] leading-none text-[var(--gym-cyan)] mb-3">INSERT A GTM QUESTION INSTEAD</p>
          <div className="flex flex-col gap-2.5">
            {detour.questions.map((q) => {
              const className =
                "group flex items-center gap-3 w-full max-w-[560px] rounded-xl border border-[var(--gym-line)] bg-white/[0.03] px-4 py-3 text-left text-[16px] font-semibold text-foreground/90 cursor-pointer transition-colors hover:border-[var(--gym-pink)] hover:text-foreground";
              const inner = (
                <>
                  <span className="font-osd text-[18px] leading-none text-[var(--gym-pink)] transition-transform group-hover:translate-x-0.5">▶</span>
                  <span className="min-w-0">{q}</span>
                </>
              );
              return onAsk ? (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    track("Detour question", { kind: detour.kind });
                    onAsk(q);
                  }}
                  className={className}
                >
                  {inner}
                </button>
              ) : (
                <a key={q} href={`/ask?q=${encodeURIComponent(q)}`} className={className}>
                  {inner}
                </a>
              );
            })}
          </div>
        </div>
      )}
      {!streaming && (
        <p className="relative mt-6 font-osd text-[16px] leading-none text-muted-foreground">
          THIS MACHINE ONLY PLAYS GO-TO-MARKET. NO REFUNDS ON PAELLA.
        </p>
      )}
    </div>
  );
}

/**
 * One move: its name, the coaching, and (for how-to answers) the exact words
 * to use, with a copy button. Moves from older answers are just the body.
 */
function GymMove({
  text,
  growing,
  section,
}: {
  text: string;
  growing: boolean;
  section: Omit<React.ComponentProps<typeof MarkdownSection>, "content">;
}) {
  const { name, body, say } = useMemo(() => parseMove(text), [text]);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(say.join("\n"));
      setCopied(true);
      sfx("coin");
      track("Words copied", { from: "answer" });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className={cn(growing && !say.length && "chat-stream-cursor")}>
      <p className="font-osd text-[16px] leading-none text-muted-foreground/80 mb-2 pt-1.5">MOVE</p>
      {name && <p className="mb-1.5 text-[19px] font-semibold leading-snug text-foreground">{name}</p>}
      {body && (
        <div className={cn(PROSE_CLASS, "prose-p:my-0 max-w-[60ch] prose-p:text-[18px] prose-p:leading-[1.7] prose-p:text-foreground/90")}>
          <MarkdownSection content={body} {...section} />
        </div>
      )}
      {say.length > 0 && (
        <figure className="group/say relative mt-4 max-w-[60ch] rounded-r-lg border-l-[3px] border-[var(--gym-pink)] bg-white/[0.035] py-3 pl-4 pr-12">
          <figcaption className="mb-1.5 text-[12px] font-semibold text-[var(--gym-pink)]">Say it like this</figcaption>
          <div className={cn("space-y-1 text-[17px] leading-[1.6] text-foreground", growing && "chat-stream-cursor")}>
            {say.map((line, i) => (line.trim() ? <p key={i}>{line}</p> : <div key={i} className="h-2" />))}
          </div>
          {!growing && (
            <button
              type="button"
              onClick={copy}
              aria-label="Copy these words"
              className="absolute right-2 top-2 inline-flex h-8 items-center gap-1 rounded-md px-2 text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </figure>
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
  // Resolve the clip window up front, so the card can say how long it is and
  // play starts without a wait
  const moment = useMemo(
    () => ({ videoId: citation.videoId, startMs: citation.startMs, endMs: citation.endMs }),
    [citation.videoId, citation.startMs, citation.endMs]
  );
  const clip = useGymClip(citation.playbackId ? moment : null);
  const thumb = citation.playbackId
    ? `https://image.mux.com/${citation.playbackId}/thumbnail.webp?time=${seconds}&width=720`
    : null;

  if (open && citation.playbackId) {
    return (
      <div className={cn("rounded-xl overflow-hidden border border-[var(--gym-cyan)] shadow-[0_0_32px_-8px_var(--gym-cyan)] bg-black", className)}>
        <GymClipPlayer
          moment={moment}
          playbackId={citation.playbackId}
          title={citation.videoTitle}
          engagement={open}
          className="aspect-video"
        />
        <div className="flex items-center justify-between gap-3 px-3 py-2 bg-[var(--gym-night-2)]">
          <p className="min-w-0 truncate text-[13px] font-semibold text-foreground/90">{citation.videoTitle}</p>
          <span className="shrink-0 font-osd text-[17px] leading-none text-[var(--gym-cyan)]">▶ {clip ? clipLabel(clip) : "CLIP"}</span>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (!interaction) return;
        setOpen(new SourceOpen(citation.videoId, interaction));
        unlock("replay");
        track("Clip played", { video: citation.videoTitle.slice(0, 120) });
      }}
      className={cn(
        "group w-full max-w-[560px] text-left grid grid-cols-[132px_1fr] sm:grid-cols-[168px_1fr] gap-3.5 sm:gap-4 items-center",
        "rounded-xl p-2 -m-2 cursor-pointer hover:bg-white/[0.03] transition-colors",
        className
      )}
    >
      <div className="relative aspect-video rounded-lg overflow-hidden bg-black ring-1 ring-[var(--gym-line)] group-hover:ring-[var(--gym-cyan)] transition-[box-shadow]">
        {thumb && (
          // Plain img: Mux serves exact-second frames; next/image would proxy each one
          <img src={thumb} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-90 transition-[transform,opacity] duration-500 group-hover:scale-[1.04] group-hover:opacity-100" />
        )}
        {number != null && (
          <span className="absolute top-1.5 left-1.5 min-w-5 h-5 px-1 grid place-items-center rounded bg-black/65 font-display text-[10px] leading-none text-white/90">
            {number}
          </span>
        )}
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid place-items-center h-9 w-9 rounded-full bg-black/55 text-white ring-1 ring-white/30 backdrop-blur-[2px] transition-all group-hover:scale-110 group-hover:bg-[var(--gym-pink)] group-hover:ring-0">
            <Play className="h-3.5 w-3.5 fill-current translate-x-px" />
          </span>
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-[14.5px] font-semibold leading-snug text-foreground/95 line-clamp-2 group-hover:text-foreground">
          {citation.videoTitle}
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <span className="font-osd text-[17px] leading-none text-[var(--gym-cyan)]">▶ {clip ? clipLabel(clip) : "CLIP"}</span>
          {coach && (
            <>
              <span aria-hidden>·</span>
              <Image src={`/gym/game/cast/${coach.slug}.webp`} alt="" width={18} height={18} className="h-[18px] w-[18px]" />
              <span>{coachLabel(coach)}</span>
            </>
          )}
          {label && (
            <>
              <span aria-hidden>·</span>
              <span>{label}</span>
            </>
          )}
        </p>
        {proofQuote(citation.text) && (
          <p className="mt-1 text-[13px] leading-snug text-muted-foreground/70 line-clamp-1">
            &ldquo;{citation.text.trim()}&rdquo;
          </p>
        )}
      </div>
    </button>
  );
}

/** The closing action as your next quest. Complete it, share it, print it. */
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
  const [burst, setBurst] = useState(0);

  const complete = () => {
    if (done) {
      setDone(false);
      return;
    }
    setDone(true);
    setBurst((n) => n + 1);
    sfx("quest");
    track("Quest complete");
    addXp(100, "QUEST");
    unlock("quest");
  };

  const share = async () => {
    const url = shareUrl || window.location.href;
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ url, title: "My run in The GTM Game" });
        track("Share", { via: "native" });
        unlock("player-2");
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      sfx("coin");
      track("Share", { via: "copy" });
      unlock("player-2");
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
            src={coach ? `/gym/game/cast/${coach.slug}.webp` : "/gym/game/game-master-bot.webp"}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8"
          />
          <span className="font-display text-[13px] uppercase gym-sunset-text">Your next quest</span>
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
              onClick={complete}
              aria-pressed={done}
              className={cn(
                button,
                "relative",
                done
                  ? "bg-[var(--gym-cyan)] text-[#06121a]"
                  : "border border-[var(--gym-line)] text-foreground/90 hover:border-[var(--gym-cyan)] hover:text-[var(--gym-cyan)]"
              )}
            >
              <Check className="h-4 w-4" strokeWidth={3} />
              {done ? "Quest complete! +100 XP" : "I did it"}
              {burst > 0 && done && <CoinBurst key={burst} />}
            </button>
            <button
              type="button"
              onClick={share}
              className={cn(button, "border border-[var(--gym-line)] text-foreground/90 hover:border-[var(--gym-pink)] hover:text-[var(--gym-pink)]")}
            >
              <Share2 className="h-4 w-4" />
              {copied ? "Link copied. Challenge a friend." : "Share your run"}
            </button>
            {printUrl && (
              <a
                href={printUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  unlock("guide");
                  track("Playbook");
                }}
                className={cn(button, "border border-[var(--gym-line)] text-foreground/90 hover:border-[var(--gym-yellow)] hover:text-[var(--gym-yellow)]")}
              >
                <BookOpen className="h-4 w-4" />
                Playbook
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Eight pixel coins popping out of the quest button. */
function CoinBurst() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {Array.from({ length: 8 }, (_, i) => {
        const a = (Math.PI * 2 * i) / 8 - Math.PI / 2;
        return (
          <span
            key={i}
            className="gym-coin"
            style={{ "--dx": `${Math.round(Math.cos(a) * 46)}px`, "--dy": `${Math.round(Math.sin(a) * 30 - 10)}px` } as React.CSSProperties}
          />
        );
      })}
    </span>
  );
}
