"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  onArcadeEvent,
  setSecret,
  sfx,
  unlock,
  useArcade,
  type Achievement,
} from "@/lib/gym-arcade";
import { track } from "@/lib/gym-track";
import { PRIZE_LIVE, RANKS, type Rank } from "@/lib/gym-ranks";
import { readChallenge, type Challenge } from "./dodger/challenge";

/**
 * The machine's global layer, mounted once in the layout:
 *
 *   ↑↑↓↓←→←→BA     secret mode (CRT, turbo floor, the hidden coach) and the
 *                  Objection Dodger secret level. On touch: swipe the arrows,
 *                  then tap twice. ?play=daily opens today's daily run;
 *                  &beat=4200&by=MF adds a challenge (see dodger/challenge.ts).
 *   toasts         achievements, XP and rank-ups
 *   tab title      "PAUSED" while you're away
 *   console        a note for anyone reading the source
 *   night owl      playing between midnight and 5am
 */

const Dodger = dynamic(() => import("./gym-dodger").then((m) => m.GymDodger), { ssr: false });

const CODE = ["up", "up", "down", "down", "left", "right", "left", "right", "b", "a"];
const KEYS: Record<string, string> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  b: "b",
  B: "b",
  a: "a",
  A: "a",
};

type Toast =
  | { id: number; kind: "achievement"; achievement: Achievement }
  | { id: number; kind: "rank"; rank: Rank }
  | { id: number; kind: "xp"; amount: number; label: string };

function useKonami(onUnlock: () => void) {
  const callback = useRef(onUnlock);
  useEffect(() => {
    callback.current = onUnlock;
  });

  useEffect(() => {
    let buffer: string[] = [];
    const push = (step: string) => {
      buffer = [...buffer, step].slice(-CODE.length);
      if (buffer.length === CODE.length && buffer.every((s, i) => s === CODE[i])) {
        buffer = [];
        callback.current();
      }
    };

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // Letters typed into a field are questions, not cheat codes
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName) && !e.key.startsWith("Arrow")) return;
      const step = KEYS[e.key];
      if (step) push(step);
      else buffer = [];
    };

    // Touch: swipes are the arrows, the two taps after them are B and A
    let start: { x: number; y: number } | null = null;
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      start = { x: t.clientX, y: t.clientY };
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      start = null;
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
        const expected = CODE[buffer.length];
        if (expected === "b" || expected === "a") push(expected);
        else buffer = [];
        return;
      }
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 40) return;
      push(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);
}

export function GymArcade() {
  const { secret } = useArcade();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dodger, setDodger] = useState<false | "arcade" | "daily">(false);
  // A challenge link (/beat/4200?by=MF lands on ?play=daily&beat=…): the run
  // opens with an invitation instead of the code
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const nextId = useRef(0);

  // Secret mode lives on <html> so CSS anywhere can react to it
  useEffect(() => {
    document.documentElement.toggleAttribute("data-secret", secret);
  }, [secret]);

  useKonami(() => {
    sfx("powerup");
    setSecret(true);
    unlock("konami");
    track("Konami");
    setDodger("arcade");
  });

  // Notices take turns: one achievement or rank-up on screen at a time, in
  // order. XP floats only when nothing bigger is showing (big ones carry
  // their own XP), so a burst of events never stacks into a wall.
  const queue = useRef<Toast[]>([]);
  const showing = useRef(false);
  useEffect(() => {
    const showNext = () => {
      const next = queue.current.shift();
      if (!next) {
        showing.current = false;
        return;
      }
      showing.current = true;
      setToasts((list) => [...list.filter((t) => t.kind === "xp"), next]);
      setTimeout(() => {
        setToasts((list) => list.filter((t) => t.id !== next.id));
        setTimeout(showNext, 250);
      }, next.kind === "rank" ? 6000 : 3600);
    };

    return onArcadeEvent((event) => {
      if (event.type === "dodger") {
        setDodger("arcade");
        return;
      }
      if (event.type === "secret") return;
      const id = ++nextId.current;
      if (event.type === "xp") {
        if (showing.current) return;
        setToasts((list) => [...list.filter((t) => t.kind !== "xp"), { id, kind: "xp", amount: event.amount, label: event.label }]);
        setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 1600);
        return;
      }
      const toast: Toast =
        event.type === "rank" ? { id, kind: "rank", rank: event.rank } : { id, kind: "achievement", achievement: event.achievement };
      if (toast.kind === "rank") track("Rank up", { rank: toast.rank.name });
      queue.current.push(toast);
      if (!showing.current) showNext();
    });
  }, []);

  // A shared daily run (?play=daily) drops you straight into it
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("play") !== "daily") return;
    // After hydration settles, like a key press would
    const invite = readChallenge(params);
    const id = setTimeout(() => {
      params.delete("play");
      params.delete("beat");
      params.delete("by");
      const rest = params.toString();
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${rest ? `?${rest}` : ""}${window.location.hash}`);
      setSecret(true);
      setChallenge(invite);
      if (invite) track("Dodger challenge", { action: "opened", beat: invite.beat });
      setDodger("daily");
    }, 400);
    return () => clearTimeout(id);
  }, []);

  // Once per visit: the note in the console, the night-owl check
  useEffect(() => {
    console.log(
      "%c THE GTM GAME %c\n\nPLAYER 2 HAS ENTERED THE GAME.\nReading the source? Try ↑ ↑ ↓ ↓ ← → ← → B A.\n\nBuilt on Bold · https://www.boldvideo.com",
      "font:700 20px/1.6 monospace;color:#1a0616;background:linear-gradient(90deg,#ffd23f,#ff8a1f,#ff2ea6);padding:4px 10px",
      "font:14px/1.5 monospace;color:#22e6ff"
    );
    const hour = new Date().getHours();
    if (hour < 5) setTimeout(() => unlock("night-owl"), 2500);
  }, []);

  // Step away and the machine pauses
  useEffect(() => {
    let saved = document.title;
    const onVisibility = () => {
      if (document.hidden) {
        saved = document.title;
        document.title = "⏸ PAUSED · The GTM Game";
      } else if (document.title.startsWith("⏸")) {
        document.title = saved;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <>
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-3 md:right-5 top-[calc(var(--header-height)+12px)] z-[90] flex flex-col items-end gap-2.5"
      >
        {toasts.map((t) =>
          t.kind === "rank" ? (
            <RankToast key={t.id} rank={t.rank} />
          ) : t.kind === "achievement" ? (
            <div
              key={t.id}
              className="gym-pixel-box [--c:var(--gym-yellow)] flex items-center gap-3 bg-[var(--gym-night-2)] px-3.5 py-2.5 max-w-[320px] motion-safe:animate-in motion-safe:slide-in-from-right-8 motion-safe:fade-in motion-safe:duration-300"
            >
              <PixelTrophy className="h-9 w-9 shrink-0" />
              <div className="min-w-0">
                <p className="font-osd text-[15px] leading-none text-[var(--gym-yellow)]">ACHIEVEMENT UNLOCKED</p>
                <p className="mt-1 font-display text-[14px] uppercase leading-tight text-foreground">
                  {t.achievement.title}
                </p>
                <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                  {t.achievement.detail}
                  {t.achievement.xp ? <span className="text-[var(--gym-cyan)]"> +{t.achievement.xp} XP</span> : null}
                </p>
              </div>
            </div>
          ) : (
            <div
              key={t.id}
              className="font-osd text-[24px] leading-none text-[var(--gym-cyan)] [text-shadow:0_0_10px_var(--gym-cyan)] motion-safe:animate-[gym-xp-float_1.8s_ease-out_both]"
            >
              +{t.amount} XP <span className="text-foreground/80">{t.label}</span>
            </div>
          )
        )}
      </div>
      {dodger && (
        <Dodger
          initialMode={dodger}
          challenge={challenge}
          onClose={() => {
            setDodger(false);
            setChallenge(null);
          }}
        />
      )}
    </>
  );
}

/** RANK UP: the new name and what it just unlocked. */
function RankToast({ rank }: { rank: Rank }) {
  const top = rank.index === RANKS.length - 1;
  return (
    <Link
      href="/quests"
      className="pointer-events-auto gym-pixel-box [--c:var(--gym-pink)] block bg-[var(--gym-night-2)] px-4 py-3 max-w-[340px] motion-safe:animate-in motion-safe:zoom-in-90 motion-safe:fade-in motion-safe:duration-300"
    >
      <p className="font-osd text-[16px] leading-none text-[var(--gym-pink)] gym-blink">RANK UP</p>
      <p className="mt-1.5 font-display text-[20px] uppercase leading-none gym-sunset-text">{rank.name}</p>
      <p className="mt-2 text-[13px] leading-snug text-foreground/85">
        <span className="font-semibold text-[var(--gym-cyan)]">Unlocked: {top && PRIZE_LIVE ? "the grand prize" : rank.perk}.</span>{" "}
        {rank.detail}
      </p>
    </Link>
  );
}

/** Our own 12×12 trophy. */
export function PixelTrophy({ className }: { className?: string }) {
  const rows = [
    "..YYYYYYYY..",
    "YYYWWYYYYYYY",
    "Y.YWYYYYYY.Y",
    "Y.YYYYYYYY.Y",
    ".YYYYYYYYYY.",
    "..YYYYYYYY..",
    "...YYYYYY...",
    ".....YY.....",
    ".....YY.....",
    "...OOOOOO...",
    "..OOOOOOOO..",
    "..PPPPPPPP..",
  ];
  const fill: Record<string, string> = { Y: "#ffd23f", W: "#fff6c9", O: "#ff8a1f", P: "#ff2ea6" };
  return (
    <svg viewBox="0 0 12 12" className={className} shapeRendering="crispEdges" aria-hidden>
      {rows.flatMap((row, y) =>
        row.split("").map((c, x) => (fill[c] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill[c]} /> : null))
      )}
    </svg>
  );
}
