"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Play, Share2, Volume2, VolumeX, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { track } from "@/lib/gym-track";
import {
  addHighScore,
  addXp,
  getStage,
  qualifies,
  recordDaily,
  sfx,
  toggleSound,
  unlock,
  useArcade,
} from "@/lib/gym-arcade";
import {
  H,
  W,
  createGame,
  dailyNumber,
  seedFor,
  seeded,
  setPool,
  shareGrid,
  tap,
  today,
  typeKey,
  unlockTarget,
  update,
  type Game,
  type Mode,
} from "./dodger/engine";
import { HOUSE, type BossDef, type Clip, type Objection } from "./dodger/objections";
import { money, render } from "./dodger/render";
import { createCrt } from "./dodger/crt";
import { Music } from "./dodger/music";
import { clipLabel } from "@/lib/gym-clip-window";

/**
 * The secret level. You're a launch at the bottom of the screen; objections
 * rain down. Type the counter under one to blast it (or tap it), brush past
 * for near misses, beat a boss every fourth level and win a real coach's
 * tape. With a business on file (or typed in), the coach scouts the
 * objections your own buyers throw, and those are what fall.
 *
 *   ARCADE   your objections, high scores on this machine
 *   DAILY    the same run for everyone today, global top 10, a share grid
 *
 * Drawn at 320×240, shown through a WebGL CRT (flat canvas without WebGL).
 */

const MuxPlayer = dynamic(() => import("@mux/mux-player-react"), { ssr: false });

type Phase = "attract" | "play" | "boss" | "initials" | "over";
type Intel =
  | { status: "house" }
  | { status: "loading"; label: string | null }
  | { status: "ready"; label: string | null; objections: Objection[] };

interface Result {
  mode: Mode;
  score: number;
  kos: number;
  grazes: number;
  combo: number;
  time: number;
  grid: string;
  killer: Objection | null;
}

interface Board {
  enabled: boolean;
  scores: { initials: string; score: number }[];
  rank?: number;
}

const INTEL_KEY = "gtm-game:intel";
const INTEL_TTL = 3 * 86400000;

function readIntel(): { business: string; label: string | null; objections: Objection[]; at: number } | null {
  try {
    const raw = window.localStorage.getItem(INTEL_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return Array.isArray(v.objections) && Date.now() - v.at < INTEL_TTL ? v : null;
  } catch {
    return null;
  }
}

interface Scouted {
  label: string | null;
  objections: Objection[];
}

/** Ask the coach to scout the player's buyers. Null: play the house set. */
async function requestIntel(business: string): Promise<Scouted | null> {
  try {
    const res = await fetch("/api/gym/dodger/objections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business, stage: getStage() }),
    });
    const data = await res.json();
    return data.personalized && Array.isArray(data.objections) ? { label: data.label ?? null, objections: data.objections } : null;
  } catch {
    return null;
  }
}

function writeIntel(business: string, label: string | null, objections: Objection[]) {
  try {
    window.localStorage.setItem(INTEL_KEY, JSON.stringify({ business, label, objections, at: Date.now() }));
  } catch {
    /* private mode */
  }
}

export function GymDodger({ onClose, initialMode = "arcade" }: { onClose: () => void; initialMode?: "arcade" | "daily" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef<Game>(createGame("demo", HOUSE));
  const input = useRef({ left: false, right: false });
  const [phase, setPhase] = useState<Phase>("attract");
  const phaseRef = useRef<Phase>("attract");
  const [mode, setMode] = useState<"arcade" | "daily">(initialMode);
  // Mounted client-only (dynamic, ssr: false), so storage is readable here
  const [intel, setIntel] = useState<Intel>(() => {
    const cached = readIntel();
    return cached ? { status: "ready", label: cached.label, objections: cached.objections } : { status: "house" };
  });
  const intelRef = useRef<Intel>(intel);
  const [business, setBusiness] = useState(() => readIntel()?.business ?? "");
  const [result, setResult] = useState<Result | null>(null);
  const [boss, setBoss] = useState<BossDef | null>(null);
  const [tape, setTape] = useState<{ clip: Clip | null; loading: boolean }>({ clip: null, loading: false });
  const [board, setBoard] = useState<Board | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [crtOn, setCrtOn] = useState(true);
  const [touch] = useState(() => window.matchMedia("(pointer: coarse)").matches);
  const { scores, sound } = useArcade();
  const day = today();

  const go = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  useEffect(() => {
    intelRef.current = intel;
  }, [intel]);

  // ── Scouting: the player's own objections ────────────────────────────────

  const applyIntel = useCallback((biz: string, found: Scouted) => {
    writeIntel(biz, found.label, found.objections);
    track("Dodger scouted", { source: biz ? "typed" : "profile" });
    setIntel({ status: "ready", label: found.label, objections: found.objections });
    // Mid-run: their buyers join the game
    const g = game.current;
    if (phaseRef.current === "play" && g.mode === "arcade") {
      setPool(g, found.objections);
      g.banner = { text: "INTEL IN", sub: "YOUR BUYERS JOINED THE GAME", color: "#7dffb0", t: 2.4 };
      unlock("intel");
    }
  }, []);

  const scout = useCallback(
    (biz: string) => {
      setIntel({ status: "loading", label: biz });
      void requestIntel(biz).then((found) => (found ? applyIntel(biz, found) : setIntel({ status: "house" })));
    },
    [applyIntel]
  );

  // Signed-in members with a profile get scouted without asking
  useEffect(() => {
    if (readIntel()) return;
    void requestIntel("").then((found) => found && applyIntel("", found));
  }, [applyIntel]);

  // ── Daily leaderboard ────────────────────────────────────────────────────

  useEffect(() => {
    if (mode !== "daily") return;
    let live = true;
    fetch(`/api/gym/dodger/scores?day=${day}`)
      .then((r) => r.json())
      .then((b: Board) => live && setBoard(b))
      .catch(() => live && setBoard({ enabled: false, scores: [] }));
    return () => {
      live = false;
    };
  }, [mode, day]);

  // ── Runs ─────────────────────────────────────────────────────────────────

  const start = useCallback(() => {
    const current = intelRef.current;
    if (mode === "daily") {
      game.current = createGame("daily", HOUSE, seeded(seedFor(day)));
      unlock("daily");
    } else {
      const pool = current.status === "ready" ? current.objections : HOUSE;
      game.current = createGame("arcade", pool);
      if (current.status === "ready") unlock("intel");
    }
    input.current = { left: false, right: false };
    track("Dodger run", { mode, intel: current.status === "ready" && mode === "arcade" ? "yes" : "no" });
    setResult(null);
    setBoss(null);
    setTape({ clip: null, loading: false });
    setCountdown(null);
    sfx("start");
    go("play");
  }, [mode, day, go]);

  const loadTape = useCallback(async (query: string, known?: Clip | null) => {
    if (known) return setTape({ clip: known, loading: false });
    setTape({ clip: null, loading: true });
    try {
      const res = await fetch(`/api/gym/dodger/clip?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setTape({ clip: data.clip ?? null, loading: false });
    } catch {
      setTape({ clip: null, loading: false });
    }
  }, []);

  const finish = useCallback(() => {
    const g = game.current;
    const score = Math.floor(g.score);
    const r: Result = {
      mode: g.mode,
      score,
      kos: g.kos,
      grazes: g.grazes,
      combo: g.bestCombo,
      time: g.time,
      grid: shareGrid(g),
      killer: g.killer,
    };
    setResult(r);
    track("Dodger over", { mode: g.mode, score, bosses: g.bossesBeaten });
    if (score >= 5000) unlock("boss");
    if (g.kos >= 25) unlock("closer");
    if (g.grazes >= 10) unlock("near-miss");
    if (g.bestCombo >= 35) unlock("combo-king");
    if (score >= 50) addXp(Math.floor(score / 50), "DODGER");
    if (r.killer) void loadTape(`buyer objection: ${r.killer.text.toLowerCase()}`, r.killer.clip);
    if (g.mode === "daily") {
      recordDaily(day, score);
      go(score > 0 && board?.enabled ? "initials" : "over");
    } else {
      go(qualifies(score) ? "initials" : "over");
    }
    setCountdown(15);
  }, [day, board, go, loadTape]);

  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  const bossDown = useCallback(
    (def: BossDef) => {
      unlock(def.achievement);
      track("Dodger boss", { boss: def.id });
      setBoss(def);
      input.current = { left: false, right: false };
      go("boss");
      void loadTape(def.clipQuery);
    },
    [go, loadTape]
  );
  const bossRef = useRef(bossDown);
  useEffect(() => {
    bossRef.current = bossDown;
  }, [bossDown]);

  const resume = useCallback(() => {
    setBoss(null);
    setTape({ clip: null, loading: false });
    sfx("start");
    go("play");
  }, [go]);

  const submitInitials = useCallback(
    async (initials: string) => {
      if (!result) return;
      sfx("coin");
      if (result.mode === "daily") {
        try {
          const res = await fetch("/api/gym/dodger/scores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ day, initials, score: result.score, time: result.time }),
          });
          const data = await res.json();
          if (data.scores) setBoard({ enabled: true, scores: data.scores, rank: data.rank });
        } catch {
          /* the run still counts locally */
        }
      } else {
        addHighScore(initials, result.score);
      }
      go("over");
    },
    [result, day, go]
  );

  // CONTINUE? counts down until someone touches something
  useEffect(() => {
    if (phase !== "over" || countdown === null) return;
    const id = setTimeout(() => {
      if (countdown <= 1) {
        setCountdown(null);
        setTape({ clip: null, loading: false });
        game.current = createGame("demo", intelRef.current.status === "ready" ? intelRef.current.objections : HOUSE);
        go("attract");
      } else setCountdown(countdown - 1);
    }, 1000);
    return () => clearTimeout(id);
  }, [phase, countdown, go]);

  // ── Keys ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const p = phaseRef.current;
      if (p === "initials") return;
      if (p === "play") {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (e.key === "ArrowLeft") input.current.left = true;
        else if (e.key === "ArrowRight") input.current.right = true;
        else if (e.key === "Backspace") unlockTarget(game.current);
        else if (!typeKey(game.current, e.key) && !["ArrowUp", "ArrowDown", " "].includes(e.key)) return;
        e.preventDefault();
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        if (target?.tagName === "BUTTON" || target?.tagName === "A") return;
        e.preventDefault();
        if (p === "boss") resume();
        else start();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") input.current.left = false;
      if (e.key === "ArrowRight") input.current.right = false;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [start, resume, onClose]);

  // ── The loop: runs in every phase, so the attract demo stays alive ───────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const font = getComputedStyle(document.documentElement).getPropertyValue("--font-vt323").trim() || "monospace";

    const screen = document.createElement("canvas");
    screen.width = W;
    screen.height = H;
    const ctx = screen.getContext("2d");
    if (!ctx) return;
    const crt = createCrt(canvas, reducedMotion);
    const flat = crt ? null : canvas.getContext("2d");
    if (flat) flat.imageSmoothingEnabled = false;
    setCrtOn(Boolean(crt));

    const widths = new Map<string, number>();
    const measure = (s: string, size: number) => {
      const key = `${size}:${s}`;
      let w = widths.get(key);
      if (w === undefined) {
        ctx.font = `${size}px ${font}`;
        w = ctx.measureText(s).width;
        widths.set(key, w);
      }
      return w;
    };

    const music = new Music();
    // QA handle in development: window.__dodger.current is the live game
    if (process.env.NODE_ENV !== "production") (window as unknown as { __dodger?: typeof game }).__dodger = game;
    let raf = 0;
    let last = performance.now();
    const born = last;

    const frame = (now: number) => {
      const real = Math.min(0.05, (now - last) / 1000);
      last = now;
      const p = phaseRef.current;
      const g = game.current;

      // Paused for a boss tape or initials: the frame holds; a finished run keeps exploding
      const running = p === "play" || (p === "attract" && g.mode === "demo") || g.over;
      update(g, running ? real : 0, input.current, measure);

      // Demo pilot crashed: next demo
      if (p === "attract" && g.over && g.particles.length === 0) {
        const intelNow = intelRef.current;
        game.current = createGame("demo", intelNow.status === "ready" ? intelNow.objections : HOUSE);
      }

      for (const event of g.events.splice(0)) {
        if (event.type === "over") finishRef.current();
        if (event.type === "boss-down") bossRef.current(event.boss);
      }

      // Music follows the action
      const want = p === "play" && !g.over ? (g.boss ? "boss" : "run") : null;
      if (want !== music.playing) {
        if (want) music.start(want);
        else music.stop();
      }
      music.setSpeed(Math.min(g.stage, 12) * 2);

      render(ctx, g, p === "play" || p === "boss", { font, flashInFrame: !crt, reducedMotion, clock: (now - born) / 1000 });
      if (crt) crt.draw(screen, { split: g.shake * 0.35 + g.flash * 2, flash: g.flash });
      else if (flat) flat.drawImage(screen, 0, 0, canvas.width, canvas.height);

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      music.stop();
      crt?.dispose();
    };
  }, []);

  // Muting mid-run kills the music on the next frame; unmuting needs a run
  useEffect(() => {
    if (sound) sfx("select");
  }, [sound]);

  const hold = (side: "left" | "right" | null) => {
    input.current.left = side === "left";
    input.current.right = side === "right";
  };

  const [copied, setCopied] = useState(false);
  const share = async () => {
    if (!result) return;
    const url = `${window.location.origin}/?play=daily`;
    const text = [
      `THE GTM GAME · DAILY #${dailyNumber(day)}`,
      result.grid,
      `${money(result.score)} pipeline · ${result.kos} KOs · ${result.combo} combo`,
      result.killer ? `Taken out by: "${result.killer.text}"` : "",
    ]
      .filter(Boolean)
      .join("\n");
    try {
      if (navigator.share) await navigator.share({ text, url });
      else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
      unlock("player-2");
      track("Dodger share");
    } catch {
      /* dismissed */
    }
  };

  const askHref = result?.killer
    ? `/ask?q=${encodeURIComponent(`My buyers keep saying "${result.killer.text.toLowerCase()}". How do I handle it?`)}`
    : "/ask";

  return (
    <div
      className="fixed inset-0 z-[80] overflow-y-auto bg-[rgba(6,3,14,0.92)] backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
      role="dialog"
      aria-modal="true"
      aria-label="Secret level: Objection Dodger"
    >
      <div className="relative mx-auto w-full max-w-[820px] px-3 py-4 md:py-8">
        <div className="flex items-end justify-between mb-2 px-1">
          <div>
            <p className="font-osd text-[18px] leading-none text-[var(--gym-cyan)]">SECRET LEVEL UNLOCKED</p>
            <p className="mt-1 font-display text-[22px] md:text-[28px] leading-none gym-sunset-text">Objection Dodger</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSound}
              aria-label={sound ? "Turn sound off" : "Turn sound on"}
              aria-pressed={sound}
              className={cn(
                "h-10 px-3 grid grid-flow-col place-items-center gap-2 rounded-lg border font-osd text-[17px] leading-none cursor-pointer",
                sound ? "border-[var(--gym-cyan)] text-[var(--gym-cyan)]" : "border-[var(--gym-line)] text-foreground/70 hover:text-foreground"
              )}
            >
              {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              <span className="hidden sm:inline">{sound ? "SOUND ON" : "SOUND OFF"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close the secret level"
              className="h-10 w-10 grid place-items-center rounded-lg border border-[var(--gym-line)] text-foreground/80 hover:border-[var(--gym-pink)] hover:text-[var(--gym-pink)] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* The cabinet screen */}
        <div className="gym-pixel-box [--c:var(--gym-pink)] relative bg-black overflow-hidden">
          <canvas
            ref={canvasRef}
            width={W * 3}
            height={H * 3}
            className="block w-full aspect-[4/3] [image-rendering:pixelated] touch-none select-none"
            onPointerDown={(e) => {
              if (phaseRef.current !== "play") return;
              const r = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - r.left) / r.width) * W;
              const y = ((e.clientY - r.top) / r.height) * H;
              if (e.pointerType !== "mouse" && tap(game.current, x, y)) return;
              hold(x < W / 2 ? "left" : "right");
            }}
            onPointerUp={() => hold(null)}
            onPointerLeave={() => hold(null)}
            onPointerCancel={() => hold(null)}
          />
          {!crtOn && <div className="pointer-events-none absolute inset-0 gym-scanlines opacity-80" />}

          {phase === "attract" && (
            <Screen dim>
              <p className="font-display text-[22px] md:text-[34px] leading-none gym-sunset-text [text-shadow:none]">OBJECTION DODGER</p>
              <p className="mt-2 font-osd text-[16px] md:text-[20px] text-[var(--gym-cyan)] leading-none">
                {mode === "daily" ? `DAILY RUN #${dailyNumber(day)}` : intel.status === "ready" ? "STARRING YOUR BUYERS" : "ARCADE"}
              </p>
              <button type="button" onClick={start} className="pointer-events-auto mt-4 md:mt-6 font-osd text-[26px] md:text-[34px] leading-none text-[var(--gym-yellow)] gym-blink cursor-pointer">
                PRESS START
              </button>
              <p className="mt-3 font-osd text-[14px] md:text-[17px] text-foreground/85 leading-tight">
                {touch ? "TAP AN OBJECTION TO BLAST IT · HOLD A SIDE TO MOVE" : "TYPE THE WORD UNDER AN OBJECTION TO BLAST IT · ← → TO MOVE"}
              </p>
            </Screen>
          )}

          {phase === "boss" && boss && (
            <Screen>
              <p className="font-osd text-[18px] md:text-[22px] leading-none" style={{ color: boss.color }}>{boss.name}</p>
              <p className="mt-1 font-display text-[28px] md:text-[42px] leading-none gym-sunset-text [text-shadow:none]">DEFEATED</p>
              <p className="mt-3 max-w-[36ch] text-[13px] md:text-[15px] text-foreground/85 leading-snug">
                Your reward: a tape from the coaches. {boss.lesson}
              </p>
              <button type="button" onClick={resume} className="pointer-events-auto mt-4 font-osd text-[22px] md:text-[28px] leading-none text-[var(--gym-yellow)] gym-blink cursor-pointer">
                CONTINUE ▶
              </button>
            </Screen>
          )}

          {phase === "initials" && result && (
            <Screen>
              <p className="font-osd text-[20px] md:text-[22px] text-[var(--gym-cyan)] leading-none">
                {result.mode === "daily" ? "POST TO TODAY'S BOARD" : "NEW HIGH SCORE"}
              </p>
              <p className="mt-1 font-display text-[24px] md:text-[34px] leading-none gym-sunset-text [text-shadow:none]">{money(result.score)}</p>
              <p className="mt-2 font-osd text-[16px] md:text-[18px] text-foreground/80">ENTER YOUR INITIALS</p>
              <Initials onDone={submitInitials} />
            </Screen>
          )}

          {phase === "over" && result && (
            <Screen>
              <p className="font-display text-[30px] md:text-[44px] leading-none text-[var(--gym-pink)] [text-shadow:0_0_24px_var(--gym-pink)]">GAME OVER</p>
              <p className="mt-2 font-osd text-[18px] md:text-[22px] text-foreground leading-none">PIPELINE {money(result.score)}</p>
              <p className="mt-1 font-osd text-[15px] md:text-[17px] text-muted-foreground leading-none">
                {result.kos} KOS · {result.grazes} NEAR MISSES · BEST COMBO {result.combo}
              </p>
              {result.mode === "daily" && <p className="mt-2 text-[18px] md:text-[22px] leading-none tracking-[2px]">{result.grid}</p>}
              <button type="button" onClick={start} className="pointer-events-auto mt-3 md:mt-4 font-osd text-[22px] md:text-[30px] leading-none text-[var(--gym-yellow)] cursor-pointer">
                {countdown !== null ? <>CONTINUE? <span className="tabular-nums">{countdown}</span></> : "PLAY AGAIN"}
              </button>
            </Screen>
          )}
        </div>

        {/* Under the screen: the control deck */}
        <div className="mt-3" onPointerDown={() => setCountdown(null)}>
          {phase === "attract" && (
            <div className="grid gap-3 md:grid-cols-[1.25fr_1fr]">
              <div className="gym-pixel-box [--c:var(--gym-line)] bg-[var(--gym-night-2)] p-3.5">
                <p className="font-osd text-[16px] leading-none text-muted-foreground">SELECT MODE</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <ModeButton active={mode === "arcade"} onClick={() => setMode("arcade")} title="ARCADE" detail="Your buyers' objections" />
                  <ModeButton active={mode === "daily"} onClick={() => setMode("daily")} title={`DAILY #${dailyNumber(day)}`} detail="Same run for everyone" />
                </div>
                {mode === "arcade" ? (
                  <form
                    className="mt-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (business.trim()) void scout(business.trim());
                    }}
                  >
                    <label htmlFor="dodger-business" className="font-osd text-[16px] leading-none text-[var(--gym-cyan)]">
                      WHAT DO YOU SELL, AND TO WHOM?
                    </label>
                    <div className="mt-1.5 flex gap-2">
                      <input
                        id="dodger-business"
                        value={business}
                        onChange={(e) => setBusiness(e.target.value)}
                        maxLength={400}
                        placeholder="Payroll software for 20-person agencies"
                        className="min-w-0 flex-1 h-10 rounded-md bg-black/40 border border-[var(--gym-line)] px-3 text-[14px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-[var(--gym-cyan)]"
                      />
                      <button
                        type="submit"
                        disabled={intel.status === "loading" || !business.trim()}
                        className="h-10 px-3 rounded-md gym-button text-[13px] cursor-pointer disabled:opacity-50 disabled:cursor-default"
                      >
                        Scout
                      </button>
                    </div>
                    <IntelStatus intel={intel} />
                  </form>
                ) : (
                  <p className="mt-3 text-[13px] text-muted-foreground leading-snug">
                    Everyone gets the same objections in the same order today, until the first boss falls. One shot at the board, a grid to brag with.
                  </p>
                )}
              </div>
              <div className="gym-pixel-box [--c:var(--gym-line)] bg-[var(--gym-night-2)] p-3.5">
                {mode === "daily" ? (
                  <>
                    <p className="font-osd text-[16px] leading-none text-muted-foreground">
                      {board?.enabled ? "TODAY'S TOP 10 · WORLDWIDE" : "TODAY ON THIS MACHINE"}
                    </p>
                    {board?.enabled ? (
                      board.scores.length ? (
                        <HighScores scores={board.scores} limit={10} />
                      ) : (
                        <p className="mt-3 font-osd text-[18px] text-[var(--gym-yellow)]">BOARD&apos;S EMPTY. CLAIM #1.</p>
                      )
                    ) : (
                      <DailyBest day={day} />
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-osd text-[16px] leading-none text-muted-foreground">HIGH SCORES · THIS MACHINE</p>
                    <HighScores scores={scores} limit={5} />
                  </>
                )}
              </div>
            </div>
          )}

          {phase === "play" && (
            <p className="text-center font-osd text-[15px] md:text-[17px] text-muted-foreground">
              {touch
                ? "TAP OBJECTIONS · HOLD LEFT OR RIGHT TO MOVE · ★ CASE STUDY ♥ REFERRAL ⚡ URGENCY ▶ RECEIPTS"
                : "TYPE THE COUNTER · ← → MOVE · BACKSPACE DROPS TARGET · ★ CASE STUDY ♥ REFERRAL ⚡ URGENCY ▶ RECEIPTS"}
            </p>
          )}

          {phase === "boss" && boss && (
            <Tape heading="BOSS REWARD · A TAPE FROM THE COACHES" tape={tape}>
              <button type="button" onClick={resume} className="h-10 px-4 rounded-md gym-button text-[13px] cursor-pointer">
                Back to the run ▶
              </button>
            </Tape>
          )}

          {(phase === "over" || phase === "initials") && result && (
            <div className="grid gap-3">
              {result.killer && (
                <div className="gym-pixel-box [--c:var(--gym-pink)] bg-[var(--gym-night-2)] p-3.5">
                  <p className="font-osd text-[16px] leading-none text-muted-foreground">THE ONE THAT GOT YOU</p>
                  <p className="mt-1.5 font-display text-[18px] md:text-[24px] leading-tight text-[var(--gym-pink)]">
                    &ldquo;{result.killer.text}&rdquo;
                  </p>
                  <p className="mt-2 text-[14px] md:text-[15px] text-foreground/90 leading-snug">
                    <span className="font-osd text-[17px] text-[var(--gym-cyan)]">COUNTER: {result.killer.counter} · </span>
                    {result.killer.move}
                  </p>
                </div>
              )}
              <Tape heading="THE COACH'S TAPE" tape={tape}>
                <Link href={askHref} onClick={onClose} className="h-10 px-4 inline-flex items-center rounded-md gym-button text-[13px]">
                  Ask the coach how to handle it →
                </Link>
                {result.mode === "daily" && (
                  <button type="button" onClick={share} className="h-10 px-4 inline-flex items-center gap-2 rounded-md border border-[var(--gym-cyan)] text-[13px] font-semibold text-[var(--gym-cyan)] cursor-pointer hover:bg-[var(--gym-cyan)]/10">
                    <Share2 className="h-4 w-4" />
                    {copied ? "Copied!" : "Share your run"}
                  </button>
                )}
              </Tape>
              {result.mode === "daily" && board?.enabled && board.scores.length > 0 && (
                <div className="gym-pixel-box [--c:var(--gym-line)] bg-[var(--gym-night-2)] p-3.5">
                  <p className="font-osd text-[16px] leading-none text-muted-foreground">
                    TODAY&apos;S TOP 10{board.rank ? ` · YOU'RE #${board.rank}` : ""}
                  </p>
                  <HighScores scores={board.scores} limit={10} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Screen({ children, dim = false }: { children: React.ReactNode; dim?: boolean }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-4 [text-shadow:0_2px_0_rgba(0,0,0,0.8)]",
        dim ? "bg-[rgba(11,6,24,0.45)]" : "bg-[rgba(11,6,24,0.72)]"
      )}
    >
      {children}
    </div>
  );
}

function ModeButton({ active, onClick, title, detail }: { active: boolean; onClick: () => void; title: string; detail: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        sfx("select");
        onClick();
      }}
      aria-pressed={active}
      className={cn(
        "rounded-md border px-3 py-2 text-left cursor-pointer transition-colors",
        active ? "border-[var(--gym-yellow)] bg-[var(--gym-yellow)]/10" : "border-[var(--gym-line)] hover:border-foreground/40"
      )}
    >
      <span className={cn("block font-osd text-[19px] leading-none", active ? "text-[var(--gym-yellow)]" : "text-foreground")}>{title}</span>
      <span className="mt-1 block text-[12px] text-muted-foreground leading-tight">{detail}</span>
    </button>
  );
}

function IntelStatus({ intel }: { intel: Intel }) {
  if (intel.status === "loading") {
    return (
      <p className="mt-2 font-osd text-[16px] leading-tight text-[var(--gym-yellow)] gym-blink">
        SCOUTING YOUR BUYERS… THE COACH IS READING YOUR MARKET. START NOW, THEY&apos;LL JOIN MID-RUN.
      </p>
    );
  }
  if (intel.status === "ready") {
    return (
      <div className="mt-2">
        <p className="font-osd text-[16px] leading-tight text-[#7dffb0]">
          SCOUTED{intel.label ? `: ${intel.label.toUpperCase()}` : ""} · {intel.objections.length} OBJECTIONS LOADED
        </p>
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {intel.objections.slice(0, 4).map((o) => (
            <li key={o.text} className="rounded border border-[var(--gym-line)] px-1.5 py-0.5 font-osd text-[14px] leading-none">
              <span className="text-[#ffd1ec]">{o.text}</span> <span className="text-[var(--gym-cyan)]">→ {o.counter}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <p className="mt-2 text-[12px] text-muted-foreground leading-snug">
      Tell the coach and your buyers&apos; real objections fall instead of the house set. Signed in with a profile? It already knows.
    </p>
  );
}

/** A coach moment: thumbnail until pressed, then the real player at that second. */
function Tape({ heading, tape, children }: { heading: string; tape: { clip: Clip | null; loading: boolean }; children?: React.ReactNode }) {
  const clip = tape.clip;
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const playing = clip !== null && playingKey === `${clip.playbackId}@${clip.start}`;

  return (
    <div className="gym-pixel-box [--c:var(--gym-cyan)] bg-[var(--gym-night-2)] p-3.5">
      <p className="font-osd text-[16px] leading-none text-[var(--gym-cyan)]">{clip || tape.loading ? heading : "YOUR MOVE"}</p>
      {tape.loading && <p className="mt-2 font-osd text-[17px] text-foreground/80 gym-blink">FINDING THE TAPE…</p>}
      {clip && (
        <div className="mt-2.5 grid gap-3 sm:grid-cols-[minmax(0,1.3fr)_1fr] items-start">
          <div className="relative aspect-video overflow-hidden rounded-md border border-[var(--gym-line)] bg-black">
            {playing ? (
              <MuxPlayer
                playbackId={clip.playbackId}
                extraSourceParams={{ asset_start_time: clip.start, asset_end_time: clip.end }}
                thumbnailTime={clip.start + 4}
                autoPlay
                accentColor="#ff2ea6"
                metadata={{ video_title: clip.title }}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPlayingKey(`${clip.playbackId}@${clip.start}`);
                  unlock("replay");
                  track("Clip played", { video: clip.title.slice(0, 120), source: "dodger" });
                }}
                className="group absolute inset-0 cursor-pointer"
                aria-label={`Play: ${clip.title}`}
              >
                <img
                  src={`https://image.mux.com/${clip.playbackId}/thumbnail.webp?time=${clip.start + 4}&width=640`}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                />
                <span className="absolute inset-0 grid place-items-center">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--gym-pink)] shadow-[0_0_30px_var(--gym-pink)] group-hover:scale-105 transition-transform">
                    <Play className="h-6 w-6 fill-white text-white translate-x-0.5" />
                  </span>
                </span>
              </button>
            )}
          </div>
          <div className="min-w-0">
            {clip.coach && <p className="font-osd text-[18px] leading-none text-[var(--gym-yellow)]">{clip.coach.toUpperCase()}</p>}
            <p className="mt-1 text-[14px] font-semibold leading-snug text-foreground/90 line-clamp-3">{clip.title}</p>
            <p className="mt-1 font-osd text-[16px] text-muted-foreground">▶ {clipLabel(clip)}</p>
            <div className="mt-3 flex flex-wrap gap-2">{children}</div>
          </div>
        </div>
      )}
      {!clip && !tape.loading && <div className="mt-3 flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

function DailyBest({ day }: { day: string }) {
  const { dailyBest } = useArcade();
  const best = dailyBest[day];
  return best ? (
    <p className="mt-3 font-osd text-[20px] text-[var(--gym-yellow)]">YOUR BEST TODAY: {money(best)}</p>
  ) : (
    <p className="mt-3 font-osd text-[18px] text-foreground/80">NO RUN YET TODAY.</p>
  );
}

function HighScores({ scores, limit }: { scores: { initials: string; score: number; house?: boolean }[]; limit: number }) {
  return (
    <ol className="mt-2.5 font-osd text-[17px] md:text-[19px] leading-[1.2]">
      {scores.slice(0, limit).map((s, i) => (
        <li key={`${s.initials}-${i}`} className={s.house ? "flex justify-between text-foreground/70" : "flex justify-between text-[var(--gym-yellow)]"}>
          <span>{i + 1}. {s.initials}</span>
          <span className="tabular-nums">{money(s.score)}</span>
        </li>
      ))}
    </ol>
  );
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Three letters, ▲/▼ to pick, ► to move on. Keyboard, taps or typing. */
function Initials({ onDone }: { onDone: (initials: string) => void }) {
  const [chars, setChars] = useState([0, 0, 0]);
  const [slot, setSlot] = useState(0);

  const bump = useCallback((d: number) => {
    sfx("select");
    setChars((c) => c.map((v, i) => (i === slot ? (v + d + LETTERS.length) % LETTERS.length : v)));
  }, [slot]);

  const advance = useCallback((next?: number[]) => {
    sfx("select");
    if (slot === 2) onDone((next ?? chars).map((i) => LETTERS[i]).join(""));
    else setSlot(slot + 1);
  }, [slot, chars, onDone]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") bump(1);
      else if (e.key === "ArrowDown") bump(-1);
      else if (e.key === "ArrowLeft") setSlot((s) => Math.max(0, s - 1));
      else if (e.key === "ArrowRight" || e.key === "Enter") advance();
      else if (/^[a-z0-9]$/i.test(e.key)) {
        const idx = LETTERS.indexOf(e.key.toUpperCase());
        const next = chars.map((v, i) => (i === slot ? idx : v));
        setChars(next);
        advance(next);
      } else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bump, advance, slot, chars]);

  return (
    <div className="pointer-events-auto mt-3 flex items-center gap-3">
      {chars.map((c, i) => (
        <div key={i} className="flex flex-col items-center">
          <button type="button" aria-label="Next letter" onClick={() => { setSlot(i); bump(1); }} className="font-osd text-[18px] text-muted-foreground hover:text-foreground cursor-pointer px-2">▲</button>
          <span
            className={
              i === slot
                ? "font-display text-[30px] md:text-[38px] leading-none text-[var(--gym-yellow)] gym-blink"
                : "font-display text-[30px] md:text-[38px] leading-none text-foreground"
            }
          >
            {LETTERS[c]}
          </span>
          <button type="button" aria-label="Previous letter" onClick={() => { setSlot(i); bump(-1); }} className="font-osd text-[18px] text-muted-foreground hover:text-foreground cursor-pointer px-2">▼</button>
        </div>
      ))}
      <button type="button" onClick={() => advance()} className="ml-2 h-10 px-3 rounded-md gym-button text-[13px] cursor-pointer">
        {slot === 2 ? "Done" : "Next"}
      </button>
    </div>
  );
}
