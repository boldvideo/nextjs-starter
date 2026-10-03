"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ChevronDown, Copy, Flame, Play, RotateCcw, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AskCitation } from "@/lib/ask";
import { coachLabel } from "./gym-coaches-data";
import { useCoachOf } from "./use-coach-map";
import { useGymMember } from "./use-gym-member";
import { GymCoinGate } from "./gym-coin-gate";
import { ClipLength, GymClipPlayer } from "./gym-clip-player";
import { GymShareNamePrompt, useShareName, withSharer } from "./gym-share-name";
import { addXp, markCoin, needsCoin, recordPlay, sfx } from "@/lib/gym-arcade";
import { track } from "@/lib/gym-track";
import {
  guessKind,
  hitRefs,
  parseRoast,
  PITCH_MAX,
  PITCH_MIN,
  rankFor,
  ROAST_KINDS,
  stripRefs,
  type RoastKind,
} from "@/lib/gym-roast";

/** A cited session moment, as the roast route and the result page hand it over. */
export interface RoastSource {
  id: string;
  videoId: string;
  playbackId?: string;
  title?: string;
  startMs: number;
  endMs: number;
  text?: string;
}

const MINE = "gym-roasts";

function rememberMine(id: string) {
  try {
    const ids: string[] = JSON.parse(localStorage.getItem(MINE) || "[]");
    localStorage.setItem(MINE, JSON.stringify([id, ...ids.filter((x) => x !== id)].slice(0, 50)));
  } catch {
    /* private mode */
  }
}

function isMine(id: string): boolean {
  try {
    return (JSON.parse(localStorage.getItem(MINE) || "[]") as string[]).includes(id);
  } catch {
    return false;
  }
}

/** The /roast cabinet: paste, pick a kind, ROAST IT. Streams the roast in place. */
export function GymRoastCabinet() {
  const { signedIn } = useGymMember();
  const [pitch, setPitch] = useState("");
  const [kind, setKind] = useState<RoastKind | "auto">("auto");
  const [coinPending, setCoinPending] = useState<(() => void) | null>(null);
  const [run, setRun] = useState<{
    pitch: string;
    kind: RoastKind;
    text: string;
    sources: RoastSource[];
    id: string | null;
    done: boolean;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    if (signedIn) markCoin();
  }, [signedIn]);

  const length = pitch.trim().length;
  const ready = length >= PITCH_MIN && length <= PITCH_MAX && !(run && !run.done);

  const start = async () => {
    const text = pitch.trim();
    const k = kind === "auto" ? guessKind(text) : kind;
    recordPlay(`Roast my pitch: ${text.slice(0, 200)}`);
    sfx("start");
    track("Roast", { kind: k });
    setRun({ pitch: text, kind: k, text: "", sources: [], id: null, done: false, error: null });

    try {
      const res = await fetch("/api/gym/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pitch: text, kind: k }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "The roaster jammed. Try again.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const data = frame.replace(/^data: /, "");
          if (!data) continue;
          const event = JSON.parse(data);
          if (event.type === "start" && event.id) {
            rememberMine(event.id);
            setRun((r) => (r ? { ...r, id: event.id } : r));
          } else if (event.type === "text") {
            setRun((r) => (r ? { ...r, text: r.text + event.delta } : r));
          } else if (event.type === "done") {
            if (event.id) {
              rememberMine(event.id);
              window.history.replaceState(null, "", `/roast/${event.id}`);
            }
            setRun((r) => (r ? { ...r, text: event.content || r.text, sources: event.sources ?? [], id: event.id ?? r.id, done: true } : r));
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      }
      setRun((r) => (r && !r.done ? { ...r, done: true } : r));
    } catch (error) {
      setRun((r) =>
        r ? { ...r, done: true, error: error instanceof Error ? error.message : "The roaster jammed. Try again." } : r
      );
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    if (!signedIn && needsCoin()) {
      setCoinPending(() => start);
      return;
    }
    void start();
  };

  if (run && !run.error) {
    return (
      <RoastResult
        text={run.text}
        sources={run.sources}
        pitch={run.pitch}
        kind={run.kind}
        conversationId={run.id}
        streaming={!run.done}
        mine
        onAgain={() => {
          setRun(null);
          window.history.replaceState(null, "", "/roast");
        }}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-10 md:py-16">
      <p className="font-osd text-[19px] leading-none text-[var(--gym-pink)]">NEW CABINET · 1 PLAYER</p>
      <h1 className="mt-3 font-display text-[44px] md:text-[64px] leading-[0.92] gym-chrome">Roast my pitch</h1>
      <p className="mt-4 max-w-[52ch] text-[17px] leading-relaxed text-foreground/80">
        Paste your cold email, DM or pitch line. The Game Master scores it against what FounderWell&apos;s coaches teach,
        shows you the clips, and hands back a fixed version.
      </p>

      <form onSubmit={submit} className="mt-8">
        <div className="mb-3 flex flex-wrap gap-2" role="radiogroup" aria-label="What are you pasting?">
          {(["auto", ...Object.keys(ROAST_KINDS)] as (RoastKind | "auto")[]).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => {
                setKind(k);
                sfx("select");
              }}
              className={cn(
                "h-9 px-3.5 rounded-full text-[13.5px] font-semibold border transition-colors cursor-pointer",
                kind === k
                  ? "border-[var(--gym-pink)] bg-[var(--gym-pink)]/15 text-foreground"
                  : "border-[var(--gym-line)] text-foreground/75 hover:border-[var(--gym-pink)] hover:text-foreground"
              )}
            >
              {k === "auto" ? "Figure it out" : ROAST_KINDS[k].replace(/^./, (c) => c.toUpperCase())}
            </button>
          ))}
        </div>

        <div className="gym-neon-frame">
          <div className="rounded-[calc(1.1rem-2px)] bg-[var(--gym-night-2)] p-1.5">
            <label htmlFor="roast-pitch" className="sr-only">
              Your pitch
            </label>
            <textarea
              id="roast-pitch"
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e);
              }}
              rows={9}
              maxLength={PITCH_MAX + 200}
              placeholder={"Paste your cold email, DM, or pitch.\n\nSubject: quick question\nHi Sarah, …"}
              className="block w-full resize-y rounded-[calc(1.1rem-6px)] bg-transparent px-4 py-3.5 text-[16px] leading-relaxed text-foreground placeholder:text-muted-foreground/50 outline-none"
            />
            <div className="flex items-center justify-between gap-3 px-2.5 pb-1 pt-1.5">
              <span className={cn("font-osd text-[16px] leading-none", length > PITCH_MAX ? "text-[var(--gym-pink)]" : "text-muted-foreground")}>
                {length > PITCH_MAX ? `${length}/${PITCH_MAX} TOO LONG` : `${length} CHARS`}
              </span>
              <button
                type="submit"
                disabled={!ready}
                className="gym-button h-12 px-5 rounded-xl text-[16px] uppercase inline-flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Flame className="h-5 w-5" />
                Roast it
              </button>
            </div>
          </div>
        </div>
        {run?.error && <p className="mt-3 text-sm text-[var(--destructive)]">{run.error}</p>}
        <p className="mt-3 text-[13px] text-muted-foreground">
          Judged only by the coaching sessions. If you share your score, the preview card shows the score and verdict,
          never your pitch; the result page keeps it folded away under &ldquo;The original.&rdquo;
        </p>
      </form>

      {coinPending && (
        <GymCoinGate
          onInserted={() => {
            const go = coinPending;
            setCoinPending(null);
            go();
          }}
          onLeave={() => setCoinPending(null)}
        />
      )}
    </div>
  );
}

/** The scorecard: score, verdict, hits with the coach clips, the fix. */
export function RoastResult({
  text,
  sources,
  pitch,
  kind,
  conversationId,
  streaming = false,
  mine: mineProp,
  onAgain,
}: {
  text: string;
  sources: RoastSource[];
  pitch?: string | null;
  kind?: RoastKind;
  conversationId: string | null;
  streaming?: boolean;
  mine?: boolean;
  onAgain?: () => void;
}) {
  const roast = useMemo(() => parseRoast(text), [text]);
  const [mine, setMine] = useState(!!mineProp);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading storage on mount
    if (!mineProp && conversationId) setMine(isMine(conversationId));
  }, [mineProp, conversationId]);

  const scoreReady = roast.score !== null && (!streaming || roast.verdict.length > 0);

  return (
    <div className="mx-auto w-full max-w-[860px] px-4 py-8 md:py-12">
      <p className="font-osd text-[19px] leading-none text-[var(--gym-pink)]">
        ROAST MY PITCH{kind ? ` · ${ROAST_KINDS[kind].toUpperCase()}` : ""}
      </p>

      <ScoreCard score={scoreReady ? roast.score : null} verdict={roast.verdict} streaming={streaming} />

      {/* The hits, costliest first, each with the coach who teaches the fix */}
      {roast.hits.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-[20px] uppercase gym-sunset-text">What costs you replies</h2>
          <ol className="mt-4 space-y-4">
            {roast.hits.map((hit, i) => (
              <RoastHitRow key={i} index={i} quote={hit.quote} rule={hit.rule} sources={sources} streaming={streaming} />
            ))}
          </ol>
        </section>
      )}

      {roast.fix && <FixCard fix={roast.fix} streaming={streaming} />}

      {streaming && !roast.fix && (
        <p className="mt-10 font-osd text-[20px] text-[var(--gym-cyan)] gym-blink">ROASTING…</p>
      )}

      {pitch && !streaming && <Original pitch={pitch} open={mine} />}

      {!streaming && (
        <div className="mt-10 flex flex-wrap items-center gap-2.5">
          {onAgain ? (
            <button
              type="button"
              onClick={onAgain}
              className="gym-button h-11 px-5 rounded-xl text-[14px] uppercase inline-flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Roast another
            </button>
          ) : (
            <Link href="/roast" className="gym-button h-11 px-5 rounded-xl text-[14px] uppercase inline-flex items-center gap-2">
              <Flame className="h-4 w-4" />
              {mine ? "Roast another" : "Roast my pitch"}
            </Link>
          )}
          {conversationId && roast.score !== null && <ShareRoast id={conversationId} score={roast.score} mine={mine} />}
          <Link
            href="/"
            className="h-11 px-4 rounded-xl border border-[var(--gym-line)] text-[14px] font-semibold text-foreground/85 inline-flex items-center hover:border-[var(--gym-cyan)] hover:text-[var(--gym-cyan)]"
          >
            Ask the Game Master
          </Link>
        </div>
      )}
    </div>
  );
}

/** The score, counted up once when it lands. */
function ScoreCard({ score, verdict, streaming }: { score: number | null; verdict: string; streaming: boolean }) {
  const [shown, setShown] = useState<number | null>(null);
  // The sound and XP fire once; the count itself may restart (dev remounts)
  const celebrated = useRef(false);

  useEffect(() => {
    if (score === null) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finish = () => {
      setShown(score);
      if (celebrated.current) return;
      celebrated.current = true;
      sfx(score >= 70 ? "achievement" : score >= 40 ? "powerup" : "gameover");
      if (streaming) addXp(75, "ROASTED");
    };
    if (reduce) {
      finish();
      return;
    }
    const t0 = performance.now();
    const dur = 1100;
    let frame = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      if (p < 1) {
        setShown(Math.round(score * eased));
        frame = requestAnimationFrame(tick);
      } else finish();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- count once per score
  }, [score]);

  const value = shown ?? null;
  const rank = score !== null && shown === score ? rankFor(score) : null;

  return (
    <div className="gym-pixel-box [--c:var(--gym-pink)] relative mt-5 overflow-hidden bg-[var(--gym-night-2)] px-5 py-6 md:px-8 md:py-8">
      <div className="gym-scanlines pointer-events-none absolute inset-0 opacity-50" aria-hidden />
      <div className="relative flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
        <div className="shrink-0 text-center md:text-left" aria-live="polite">
          <p className="font-osd text-[18px] leading-none text-muted-foreground">REPLY SCORE</p>
          <p
            className="mt-2 font-display text-[88px] md:text-[112px] leading-[0.85] tabular-nums"
            style={{ color: rank?.color ?? "var(--foreground)", textShadow: rank ? `0 0 28px ${rank.color}` : undefined }}
          >
            {value === null ? <span className="gym-blink text-muted-foreground/60">??</span> : value}
          </p>
          <p className="mt-1 font-osd text-[18px] leading-none text-muted-foreground">/ 100</p>
        </div>
        <div className="min-w-0 flex-1">
          {rank ? (
            <p className="font-display text-[26px] md:text-[34px] leading-none motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:fade-in motion-safe:duration-300" style={{ color: rank.color }}>
              {rank.label}
            </p>
          ) : (
            <p className="font-osd text-[22px] leading-none text-[var(--gym-cyan)] gym-blink">{streaming ? "ROASTING…" : ""}</p>
          )}
          {verdict && <p className="mt-3 text-[20px] md:text-[22px] font-semibold leading-snug text-foreground">{verdict}</p>}
          {rank && <p className="mt-2 text-[15px] text-muted-foreground">{rank.line}</p>}
        </div>
      </div>
    </div>
  );
}

function RoastHitRow({
  index,
  quote,
  rule,
  sources,
  streaming,
}: {
  index: number;
  quote: string;
  rule: string;
  sources: RoastSource[];
  streaming: boolean;
}) {
  const coachOf = useCoachOf();
  const [open, setOpen] = useState(false);
  const clip = useMemo(() => {
    for (const ref of hitRefs(rule)) {
      const s = sources.find((x) => x.id === ref);
      if (s?.playbackId) return s;
    }
    return null;
  }, [rule, sources]);
  const coach = clip ? coachOf({ videoId: clip.videoId, playbackId: clip.playbackId } as AskCitation) : null;
  const seconds = clip ? Math.floor(clip.startMs / 1000) : 0;

  return (
    <li className="grid grid-cols-[40px_1fr] gap-x-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
      <span className="font-display text-[26px] leading-none text-[var(--gym-pink)] pt-1">{index + 1}</span>
      <div className="min-w-0 rounded-xl border border-[var(--gym-line)] bg-white/[0.025] px-4 py-3.5">
        {quote && (
          <p className="text-[16px] leading-snug text-foreground/70">
            <span className="underline decoration-wavy decoration-[var(--gym-pink)] decoration-2 underline-offset-4">&ldquo;{quote}&rdquo;</span>
          </p>
        )}
        <p className={cn("text-[17px] leading-relaxed text-foreground", quote && "mt-1.5")}>{stripRefs(rule)}</p>
        {clip && !streaming && (
          <div className="mt-3">
            {open && clip.playbackId ? (
              <div className="overflow-hidden rounded-xl border border-[var(--gym-cyan)] shadow-[0_0_28px_-8px_var(--gym-cyan)]">
                <GymClipPlayer
                  moment={{ videoId: clip.videoId, startMs: clip.startMs, endMs: clip.endMs }}
                  playbackId={clip.playbackId}
                  title={clip.title || "Session"}
                  className="aspect-video"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setOpen(true);
                  track("Clip played", { video: (clip.title || "").slice(0, 120), source: "roast" });
                }}
                className="group flex w-full max-w-[520px] items-center gap-3 rounded-lg p-1.5 -m-1.5 text-left hover:bg-white/[0.04] cursor-pointer"
              >
                <span className="relative block h-[54px] w-[96px] shrink-0 overflow-hidden rounded-md bg-black ring-1 ring-[var(--gym-line)] group-hover:ring-[var(--gym-cyan)]">
                  {clip.playbackId && (
                    // Plain img: Mux serves exact-second frames
                    <img
                      src={`https://image.mux.com/${clip.playbackId}/thumbnail.webp?time=${seconds}&width=240`}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover opacity-85 group-hover:opacity-100"
                    />
                  )}
                  <span className="absolute inset-0 grid place-items-center">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/30 group-hover:bg-[var(--gym-pink)] group-hover:ring-0">
                      <Play className="h-3 w-3 fill-current translate-x-px" />
                    </span>
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-semibold text-foreground/90">{clip.title}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] text-muted-foreground">
                    <span className="whitespace-nowrap font-osd text-[16px] leading-none text-[var(--gym-cyan)]">
                      ▶ <ClipLength citation={{ videoId: clip.videoId, startMs: clip.startMs, endMs: clip.endMs, playbackId: clip.playbackId }} />
                    </span>
                    {coach ? (
                      <>
                        <span aria-hidden>·</span>
                        <Image src={`/gym/game/cast/${coach.slug}.webp`} alt="" width={16} height={16} className="h-4 w-4" />
                        <span>{coachLabel(coach)}</span>
                      </>
                    ) : (
                      <>
                        <span aria-hidden>·</span>
                        <span>Guest session</span>
                      </>
                    )}
                  </span>
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function FixCard({ fix, streaming }: { fix: string; streaming: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <section className="mt-10">
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-display text-[20px] uppercase gym-sunset-text">The fix</h2>
        {!streaming && (
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(fix);
                setCopied(true);
                sfx("coin");
                track("Words copied", { from: "roast fix" });
                setTimeout(() => setCopied(false), 1800);
              } catch {
                /* clipboard blocked */
              }
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--gym-line)] px-3 text-[13px] font-semibold text-foreground/85 hover:border-[var(--gym-cyan)] hover:text-[var(--gym-cyan)] cursor-pointer"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy the fix"}
          </button>
        )}
      </div>
      <div
        className={cn(
          "mt-3 whitespace-pre-wrap rounded-xl border-l-[3px] border-[var(--gym-cyan)] bg-white/[0.035] px-5 py-4 text-[17px] leading-[1.65] text-foreground",
          streaming && "chat-stream-cursor"
        )}
      >
        {fix}
      </div>
    </section>
  );
}

function Original({ pitch, open }: { pitch: string; open: boolean }) {
  return (
    <details open={open} className="group mt-10 rounded-xl border border-[var(--gym-line)] bg-white/[0.02]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[14px] font-semibold text-foreground/80 hover:text-foreground">
        The original
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="whitespace-pre-wrap border-t border-[var(--gym-line)] px-5 py-4 text-[15px] leading-relaxed text-foreground/70">
        {pitch}
      </div>
    </details>
  );
}

/**
 * Share the score. Your own roast says whose pitch it was (?by=Marcel, the
 * name asked once if not signed in); someone else's passes on as theirs.
 */
function ShareRoast({ id, score, mine }: { id: string; score: number; mine: boolean }) {
  const [copied, setCopied] = useState(false);
  const sharer = useShareName();
  const [askName, setAskName] = useState(false);

  const send = async (who: string | null) => {
    const url = withSharer(`${window.location.origin}/roast/${id}`, who);
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ url, title: `${who && mine ? `${who}'s` : "My"} pitch scored ${score}/100 in The GTM Game` });
        track("Roast shared", { via: "native" });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      sfx("coin");
      track("Roast shared", { via: "copy" });
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* dismissed */
    }
  };

  const share = () => {
    if (!mine) return send(new URLSearchParams(window.location.search).get("by"));
    if (!sharer.known) return setAskName(true);
    send(sharer.name);
  };

  return (
    <>
      <button
        type="button"
        onClick={share}
        className="h-11 px-4 rounded-xl border border-[var(--gym-line)] text-[14px] font-semibold text-foreground/85 inline-flex items-center gap-2 hover:border-[var(--gym-pink)] hover:text-[var(--gym-pink)] cursor-pointer"
      >
        <Share2 className="h-4 w-4" />
        {copied ? "Link copied. Dare a friend." : mine ? "Share my score" : "Share"}
      </button>
      {askName && (
        <GymShareNamePrompt
          className="order-last basis-full"
          onDone={(name) => {
            setAskName(false);
            send(sharer.remember(name));
          }}
        />
      )}
    </>
  );
}
