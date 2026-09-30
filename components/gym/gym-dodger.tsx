"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  addHighScore,
  addXp,
  qualifies,
  sfx,
  unlock,
  useArcade,
} from "@/lib/gym-arcade";

/**
 * The secret level. You're a launch (a little rocket, our own art) at the
 * bottom of the screen; objections rain down. Dodge them, grab power-ups,
 * keep your runway. Pipeline grows the longer you survive.
 *
 *   ★ CASE STUDY  +500      ♥ REFERRAL  +1 runway      ⚡ URGENCY  slow-mo
 *
 * Arrows / A-D to move (hold a side of the screen on touch). Everything is
 * drawn at 320×240 and scaled up with crisp pixels.
 */

const W = 320;
const H = 240;
const GROUND = H - 10;
const LEVEL_SECONDS = 15;

const OBJECTIONS = [
  "SEND ME SOME INFO",
  "NO BUDGET",
  "CIRCLE BACK IN Q3",
  "NOT A PRIORITY",
  "WE BUILD IN-HOUSE",
  "TOO EXPENSIVE",
  "LOOP IN LEGAL",
  "JUST BROWSING",
  "PER MY LAST EMAIL",
  "WE USE A SPREADSHEET",
  "UNSUBSCRIBE",
  "WHO ARE YOU?",
  "BAD TIMING",
  "ASK MY BOSS",
];

const POWERUPS = [
  { kind: "star", glyph: "★", label: "CASE STUDY +500", color: "#ffd23f" },
  { kind: "heart", glyph: "♥", label: "REFERRAL +1 RUNWAY", color: "#ff2ea6" },
  { kind: "bolt", glyph: "⚡", label: "URGENCY! SLOW-MO", color: "#22e6ff" },
] as const;

type Kind = (typeof POWERUPS)[number]["kind"];

interface Falling {
  x: number;
  y: number;
  w: number;
  h: number;
  vy: number;
  text: string;
  power?: Kind;
}

interface Game {
  x: number;
  lives: number;
  score: number;
  time: number;
  spawn: number;
  items: Falling[];
  hurt: number;
  slow: number;
  banner: { text: string; color: string; t: number } | null;
  stars: { x: number; y: number; s: number }[];
}

// 9×11 rocket, drawn row by row
const ROCKET = [
  "....P....",
  "...PPP...",
  "...PWP...",
  "..PPCPP..",
  "..PPPPP..",
  "..PPPPP..",
  ".OPPPPPO.",
  "OOPPPPPOO",
  "OO.PPP.OO",
  "...Y.Y...",
  "..Y...Y..",
];
const ROCKET_COLORS: Record<string, string> = {
  P: "#f6f0ff",
  W: "#22e6ff",
  C: "#ff2ea6",
  O: "#ff2ea6",
  Y: "#ffd23f",
};

function level(time: number) {
  const n = Math.floor(time / LEVEL_SECONDS);
  return { n, label: `${Math.floor(n / 4) + 1}-${(n % 4) + 1}` };
}

function money(n: number) {
  return `$${Math.floor(n).toLocaleString("en-US")}`;
}

function fresh(): Game {
  return {
    x: W / 2,
    lives: 3,
    score: 0,
    time: 0,
    spawn: 0.6,
    items: [],
    hurt: 0,
    slow: 0,
    banner: { text: "LEVEL 1-1", color: "#ffd23f", t: 1.6 },
    stars: Array.from({ length: 40 }, () => ({ x: Math.random() * W, y: Math.random() * 120, s: Math.random() })),
  };
}

type Phase = "attract" | "play" | "initials" | "over";

export function GymDodger({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef<Game>(fresh());
  const input = useRef({ left: false, right: false });
  const [phase, setPhase] = useState<Phase>("attract");
  const [final, setFinal] = useState(0);
  const [countdown, setCountdown] = useState(9);
  const { scores } = useArcade();

  const start = useCallback(() => {
    game.current = fresh();
    sfx("start");
    setPhase("play");
  }, []);

  const end = useCallback(() => {
    const score = Math.floor(game.current.score);
    sfx("gameover");
    setFinal(score);
    if (score >= 5000) unlock("boss");
    if (score >= 50) addXp(Math.floor(score / 50), "DODGER");
    setCountdown(9);
    setPhase(qualifies(score) ? "initials" : "over");
  }, []);

  // Keys: move, start, close. Arrows never scroll the page behind the game.
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (phase === "initials") return;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) e.preventDefault();
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") input.current.left = true;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") input.current.right = true;
      if ((e.key === "Enter" || e.key === " ") && phase !== "play") start();
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") input.current.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") input.current.right = false;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [phase, start, onClose]);

  // CONTINUE? 9…8…7…
  useEffect(() => {
    if (phase !== "over") return;
    const id = setTimeout(() => {
      if (countdown <= 1) setPhase("attract");
      else setCountdown(countdown - 1);
    }, 1000);
    return () => clearTimeout(id);
  }, [phase, countdown]);

  // The loop: runs in every phase so the attract screen stays alive
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const font = getComputedStyle(document.documentElement).getPropertyValue("--font-vt323").trim() || "monospace";

    let raf = 0;
    let last = performance.now();
    let floor = 0;

    const text = (s: string, x: number, y: number, color: string, size = 16, align: CanvasTextAlign = "left") => {
      ctx.font = `${size}px ${font}`;
      ctx.textAlign = align;
      ctx.fillStyle = color;
      ctx.fillText(s, Math.round(x), Math.round(y));
    };

    const frame = (now: number) => {
      const real = Math.min(0.05, (now - last) / 1000);
      last = now;
      const g = game.current;
      const playing = phase === "play";
      const dt = playing && g.slow > 0 ? real * 0.45 : real;

      // ── Update ────────────────────────────────────────────────────────
      floor = (floor + real * (playing ? 40 + level(g.time).n * 6 : 18)) % 16;
      for (const s of g.stars) {
        s.x -= real * (4 + s.s * 8);
        if (s.x < 0) s.x += W;
      }

      if (playing) {
        const lvl = level(g.time);
        g.time += dt;
        const next = level(g.time);
        if (next.n !== lvl.n) {
          g.banner = { text: `LEVEL ${next.label}`, color: "#ffd23f", t: 1.6 };
          sfx("quest");
        }
        g.score += dt * 60 * (1 + next.n * 0.5);
        g.hurt = Math.max(0, g.hurt - real);
        g.slow = Math.max(0, g.slow - real);
        if (g.banner) g.banner.t -= real;
        if (g.banner && g.banner.t <= 0) g.banner = null;

        const dir = (input.current.right ? 1 : 0) - (input.current.left ? 1 : 0);
        g.x = Math.max(10, Math.min(W - 10, g.x + dir * 160 * real));

        g.spawn -= dt;
        if (g.spawn <= 0) {
          const speed = 42 + next.n * 9 + Math.random() * 30;
          if (Math.random() < 0.12) {
            const p = POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
            g.items.push({ x: 10 + Math.random() * (W - 30), y: -14, w: 14, h: 14, vy: speed * 0.8, text: p.glyph, power: p.kind });
          } else {
            const t = OBJECTIONS[Math.floor(Math.random() * OBJECTIONS.length)];
            ctx.font = `14px ${font}`;
            const w = Math.ceil(ctx.measureText(t).width) + 8;
            g.items.push({ x: Math.random() * (W - w), y: -14, w, h: 13, vy: speed, text: t });
          }
          g.spawn = Math.max(0.28, 1.05 - next.n * 0.08) * (0.7 + Math.random() * 0.6);
        }

        // Rocket hitbox (drawn at 2×), a little forgiving at the edges
        const px = g.x - 9;
        const py = GROUND - 22;
        g.items = g.items.filter((it) => {
          it.y += it.vy * dt;
          const hit = it.x < px + 16 && it.x + it.w > px + 2 && it.y < py + 18 && it.y + it.h > py + 3;
          if (hit && it.power) {
            sfx("powerup");
            const p = POWERUPS.find((q) => q.kind === it.power)!;
            if (it.power === "star") g.score += 500;
            if (it.power === "heart") g.lives = Math.min(5, g.lives + 1);
            if (it.power === "bolt") g.slow = 5;
            g.banner = { text: p.label, color: p.color, t: 1.2 };
            return false;
          }
          if (hit && g.hurt <= 0) {
            sfx("hit");
            g.lives -= 1;
            g.hurt = 1.2;
            g.banner = { text: it.text + "!", color: "#ff2ea6", t: 1 };
            return false;
          }
          if (it.y > H) {
            if (!it.power) g.score += 50;
            return false;
          }
          return true;
        });

        if (g.lives <= 0) end();
      }

      // ── Draw ──────────────────────────────────────────────────────────
      const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
      sky.addColorStop(0, "#0b0618");
      sky.addColorStop(0.6, "#2a0b4a");
      sky.addColorStop(1, "#1c0838");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      for (const s of g.stars) {
        ctx.fillStyle = s.s > 0.7 ? "#ffffff" : "#8b7bb5";
        ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
      }

      // Striped sun sitting on the horizon
      const horizon = 150;
      const sunR = 46;
      for (let y = -sunR; y < 0; y++) {
        const band = (y + sunR) / sunR;
        if (band > 0.45 && Math.floor((y + sunR) / 3) % 2 === 1) continue;
        const half = Math.sqrt(sunR * sunR - y * y);
        ctx.fillStyle = band < 0.35 ? "#ffe45c" : band < 0.6 ? "#ffb03a" : band < 0.8 ? "#ff5a8a" : "#ff2ea6";
        ctx.fillRect(Math.round(W / 2 - half), horizon + y, Math.round(half * 2), 1);
      }

      // Floor grid rolling toward you
      ctx.fillStyle = "#1c0838";
      ctx.fillRect(0, horizon, W, H - horizon);
      ctx.fillStyle = "rgba(255,46,166,0.55)";
      for (let i = -12; i <= 12; i++) {
        const x0 = W / 2 + i * 8;
        const x1 = W / 2 + i * 60;
        for (let t = 0; t < 1; t += 0.02) {
          ctx.fillRect(Math.round(x0 + (x1 - x0) * t), Math.round(horizon + (H - horizon) * t), 1, 1);
        }
      }
      ctx.fillStyle = "rgba(34,230,255,0.5)";
      for (let k = 0; k < 7; k++) {
        const d = ((k * 16 + floor) / 112) ** 2;
        ctx.fillRect(0, Math.round(horizon + d * (H - horizon)), W, 1);
      }
      ctx.fillStyle = "#ff2ea6";
      ctx.fillRect(0, horizon, W, 1);

      if (phase === "play" || phase === "over" || phase === "initials") {
        // Falling things
        for (const it of g.items) {
          if (it.power) {
            const p = POWERUPS.find((q) => q.kind === it.power)!;
            ctx.fillStyle = "#0b0618";
            ctx.fillRect(Math.round(it.x), Math.round(it.y), it.w, it.h);
            ctx.strokeStyle = p.color;
            ctx.strokeRect(Math.round(it.x) + 0.5, Math.round(it.y) + 0.5, it.w - 1, it.h - 1);
            text(p.glyph, it.x + it.w / 2, it.y + 11, p.color, 14, "center");
          } else {
            ctx.fillStyle = "#12071f";
            ctx.fillRect(Math.round(it.x), Math.round(it.y), it.w, it.h);
            ctx.fillStyle = "#ff2ea6";
            ctx.fillRect(Math.round(it.x), Math.round(it.y), it.w, 1);
            ctx.fillRect(Math.round(it.x), Math.round(it.y + it.h - 1), it.w, 1);
            text(it.text, it.x + 4, it.y + 10, "#ffd1ec", 14);
          }
        }

        // The launch (blinks while hurt)
        if (g.hurt <= 0 || Math.floor(g.hurt * 12) % 2 === 0) {
          const ox = Math.round(g.x - 9);
          const oy = GROUND - 22;
          ROCKET.forEach((row, y) =>
            row.split("").forEach((c, x) => {
              if (c === "." || (c === "Y" && Math.random() < 0.35)) return;
              ctx.fillStyle = ROCKET_COLORS[c];
              ctx.fillRect(ox + x * 2, oy + y * 2, 2, 2);
            })
          );
        }

        // HUD
        text("PIPELINE", 6, 12, "#ff2ea6", 14);
        text(money(g.score), 6, 24, "#f6f0ff", 16);
        text(`LEVEL ${level(g.time).label}`, W / 2, 12, "#ffd23f", 14, "center");
        if (g.slow > 0) text("SLOW-MO", W / 2, 24, "#22e6ff", 14, "center");
        text("RUNWAY", W - 6, 12, "#22e6ff", 14, "right");
        text("♥".repeat(Math.max(0, g.lives)), W - 6, 24, "#ff2ea6", 14, "right");

        if (g.banner && phase === "play") {
          text(g.banner.text, W / 2, 90, g.banner.color, 22, "center");
        }
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [phase, end]);

  const hold = (side: "left" | "right" | null) => {
    input.current.left = side === "left";
    input.current.right = side === "right";
  };

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-[rgba(6,3,14,0.9)] backdrop-blur-sm p-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
      role="dialog"
      aria-modal="true"
      aria-label="Secret level: Objection Dodger"
    >
      <div className="relative w-full max-w-[760px]">
        <div className="flex items-end justify-between mb-2 px-1">
          <div>
            <p className="font-osd text-[18px] leading-none text-[var(--gym-cyan)]">SECRET LEVEL UNLOCKED</p>
            <p className="mt-1 font-display text-[22px] md:text-[28px] leading-none gym-sunset-text">Objection Dodger</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the secret level"
            className="h-10 w-10 grid place-items-center rounded-lg border border-[var(--gym-line)] text-foreground/80 hover:border-[var(--gym-pink)] hover:text-[var(--gym-pink)] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* The cabinet screen */}
        <div className="gym-pixel-box [--c:var(--gym-pink)] relative bg-black">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="block w-full aspect-[4/3] [image-rendering:pixelated] touch-none select-none"
            onPointerDown={(e) => {
              if (phase !== "play") return;
              const r = e.currentTarget.getBoundingClientRect();
              hold(e.clientX - r.left < r.width / 2 ? "left" : "right");
            }}
            onPointerUp={() => hold(null)}
            onPointerLeave={() => hold(null)}
            onPointerCancel={() => hold(null)}
          />
          <div className="pointer-events-none absolute inset-0 gym-scanlines opacity-80" />

          {phase === "attract" && (
            <Screen>
              <p className="font-display text-[20px] md:text-[30px] leading-none gym-chrome">OBJECTION DODGER</p>
              <p className="mt-3 max-w-[40ch] text-[13px] md:text-[15px] text-foreground/85 leading-snug">
                Dodge the objections. Grab <span className="text-[var(--gym-yellow)]">★ case studies</span>,{" "}
                <span className="text-[var(--gym-pink)]">♥ referrals</span> and <span className="text-[var(--gym-cyan)]">⚡ urgency</span>. Don&apos;t run out of runway.
              </p>
              <HighScores scores={scores} />
              <button type="button" onClick={start} className="pointer-events-auto mt-4 font-osd text-[24px] md:text-[28px] leading-none text-[var(--gym-yellow)] gym-blink cursor-pointer">
                PRESS START
              </button>
              <p className="mt-2 font-osd text-[15px] text-muted-foreground">← → TO MOVE · HOLD A SIDE ON TOUCH · ESC TO LEAVE</p>
            </Screen>
          )}

          {phase === "initials" && (
            <Screen>
              <p className="font-osd text-[22px] text-[var(--gym-cyan)] leading-none">NEW HIGH SCORE</p>
              <p className="mt-1 font-display text-[26px] md:text-[34px] leading-none gym-sunset-text">{money(final)}</p>
              <p className="mt-3 font-osd text-[18px] text-foreground/80">ENTER YOUR INITIALS</p>
              <Initials
                onDone={(initials) => {
                  addHighScore(initials, final);
                  sfx("coin");
                  setPhase("over");
                }}
              />
            </Screen>
          )}

          {phase === "over" && (
            <Screen>
              <p className="font-display text-[30px] md:text-[44px] leading-none text-[var(--gym-pink)] [text-shadow:0_0_24px_var(--gym-pink)]">GAME OVER</p>
              <p className="mt-3 text-[13px] md:text-[15px] text-foreground/85">The objections won this round. Pipeline: {money(final)}</p>
              <p className="mt-1 text-[12px] md:text-[13px] text-muted-foreground">
                Real ones are easier with a playbook. Ask the coach how to handle the one that got you.
              </p>
              <button type="button" onClick={start} className="pointer-events-auto mt-4 font-osd text-[24px] md:text-[30px] leading-none text-[var(--gym-yellow)] cursor-pointer">
                CONTINUE? <span className="tabular-nums">{countdown}</span>
              </button>
            </Screen>
          )}
        </div>
      </div>
    </div>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-4 bg-[rgba(11,6,24,0.72)]">
      {children}
    </div>
  );
}

function HighScores({ scores }: { scores: { initials: string; score: number; house?: boolean }[] }) {
  return (
    <ol className="mt-4 w-full max-w-[260px] font-osd text-[16px] md:text-[19px] leading-[1.15]">
      {scores.slice(0, 5).map((s, i) => (
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

  const advance = useCallback(() => {
    sfx("select");
    if (slot === 2) onDone(chars.map((i) => LETTERS[i]).join(""));
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
        setChars((c) => c.map((v, i) => (i === slot ? idx : v)));
        advance();
      } else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bump, advance, slot]);

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
      <button type="button" onClick={advance} className="ml-2 h-10 px-3 rounded-md gym-button text-[13px] cursor-pointer">
        {slot === 2 ? "Done" : "Next"}
      </button>
    </div>
  );
}
