import { sfx, type Sfx } from "@/lib/gym-arcade";
import { BOSSES, HOUSE, type BossDef, type Objection } from "./objections";

/**
 * Objection Dodger's rules, free of React and canvas. A run is a list of
 * stages: three of 15 seconds, then a boss, repeat. Objections fall carrying
 * a counter word; type it (or tap the objection) to blast it, brush past one
 * for a near miss, get hit and you lose runway. Everything is in the 320×240
 * screen's own pixels.
 *
 * Daily runs draw every spawn from a seeded RNG, so the whole world gets the
 * same objections in the same order until the first boss falls.
 */

export const W = 320;
export const H = 240;
export const GROUND = H - 10;
export const ROCKET_Y = GROUND - 22;
const STAGE_SECONDS = 15;
const ITEM_H = 22;
/** Typing target meaning "the boss" */
export const BOSS_TARGET = -1;

export type Mode = "arcade" | "daily" | "demo";
export type Power = "star" | "heart" | "bolt" | "clip";

export const POWERUPS: Record<Power, { glyph: string; label: string; color: string }> = {
  star: { glyph: "★", label: "CASE STUDY +500", color: "#ffd23f" },
  heart: { glyph: "♥", label: "REFERRAL +1 RUNWAY", color: "#ff2ea6" },
  bolt: { glyph: "⚡", label: "URGENCY! SLOW-MO", color: "#22e6ff" },
  clip: { glyph: "▶", label: "RECEIPTS! SCREEN CLEAR", color: "#7dffb0" },
};
const POWER_KINDS = Object.keys(POWERUPS) as Power[];

export interface Thing {
  id: number;
  kind: "objection" | "power" | "block" | "bullet";
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  text: string;
  counter: string;
  typed: number;
  power?: Power;
  objection?: Objection;
  ghost?: boolean;
  grazed?: boolean;
  /** Cleared mid-tick (a screen clear), dropped when the tick ends */
  dead?: boolean;
}

export interface Boss {
  def: BossDef;
  loop: number;
  hp: number;
  max: number;
  x: number;
  y: number;
  vx: number;
  words: string[];
  word: string;
  typed: number;
  attack: number;
  volley: number;
  entering: boolean;
  hitT: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

export interface Popup {
  text: string;
  x: number;
  y: number;
  t: number;
  color: string;
  size: number;
}

export interface Laser {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  t: number;
  color: string;
}

/** How a stage went, for the share grid */
export interface StageResult {
  hits: number;
  boss: boolean;
  died?: boolean;
}

export type GameEvent = { type: "boss-down"; boss: BossDef } | { type: "over" };

export interface Game {
  mode: Mode;
  rng: () => number;
  pool: Objection[];
  x: number;
  lives: number;
  score: number;
  time: number;
  stage: number;
  stageTime: number;
  stageHits: number;
  log: StageResult[];
  spawn: number;
  things: Thing[];
  nextId: number;
  hurt: number;
  slow: number;
  graze: number;
  freeze: number;
  shake: number;
  flash: number;
  banner: { text: string; sub?: string; color: string; t: number } | null;
  stars: { x: number; y: number; s: number }[];
  particles: Particle[];
  popups: Popup[];
  lasers: Laser[];
  combo: number;
  bestCombo: number;
  kos: number;
  grazes: number;
  target: number | null;
  boss: Boss | null;
  bossesBeaten: number;
  killer: Objection | null;
  hitBy: Objection[];
  events: GameEvent[];
  tapCool: number;
  autoT: number;
  over: boolean;
}

export type Measure = (text: string, size: number) => number;

/** mulberry32: small, fast, good enough for falling objections */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFor(day: string): number {
  let h = 2166136261;
  for (const c of `gtm-game:${day}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function createGame(mode: Mode, pool: Objection[], rng: () => number = Math.random): Game {
  return {
    mode,
    rng,
    pool: pool.length ? pool : HOUSE,
    x: W / 2,
    lives: 3,
    score: 0,
    time: 0,
    stage: 0,
    stageTime: 0,
    stageHits: 0,
    log: [],
    spawn: 0.6,
    things: [],
    nextId: 1,
    hurt: 0,
    slow: 0,
    graze: 0,
    freeze: 0,
    shake: 0,
    flash: 0,
    banner: mode === "demo" ? null : { text: "LEVEL 1-1", sub: "TYPE THE COUNTER TO BLAST", color: "#ffd23f", t: 2.2 },
    stars: Array.from({ length: 40 }, () => ({ x: Math.random() * W, y: Math.random() * 120, s: Math.random() })),
    particles: [],
    popups: [],
    lasers: [],
    combo: 0,
    bestCombo: 0,
    kos: 0,
    grazes: 0,
    target: null,
    boss: null,
    bossesBeaten: 0,
    killer: null,
    hitBy: [],
    events: [],
    tapCool: 0,
    autoT: 0,
    over: false,
  };
}

export function stageLabel(stage: number): string {
  if (isBossStage(stage)) return `${Math.floor(stage / 4) + 1}-BOSS`;
  return `${Math.floor(stage / 4) + 1}-${(stage % 4) + 1}`;
}

export function isBossStage(stage: number): boolean {
  return stage % 4 === 3;
}

export function multiplier(g: Game): number {
  return Math.min(8, 1 + Math.floor(g.combo / 5));
}

/** Swap in a new set of objections (the player's own, when the coach is done scouting). */
export function setPool(g: Game, pool: Objection[]) {
  if (pool.length) g.pool = pool;
}

function play(g: Game, name: Sfx) {
  if (g.mode !== "demo") sfx(name);
}

function burst(g: Game, x: number, y: number, color: string, n: number, speed = 70) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.3 + Math.random());
    const life = 0.35 + Math.random() * 0.5;
    g.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, life, max: life, color, size: Math.random() < 0.3 ? 2 : 1 });
  }
}

/** A thing comes apart into pixels along its whole width */
function shatter(g: Game, t: Thing, colors: string[]) {
  const n = Math.min(60, Math.round(t.w * 0.8));
  for (let i = 0; i < n; i++) {
    const life = 0.4 + Math.random() * 0.6;
    g.particles.push({
      x: t.x + Math.random() * t.w,
      y: t.y + Math.random() * t.h,
      vx: (Math.random() - 0.5) * 120,
      vy: -40 - Math.random() * 80,
      life,
      max: life,
      color: colors[i % colors.length],
      size: Math.random() < 0.25 ? 2 : 1,
    });
  }
}

function popup(g: Game, text: string, x: number, y: number, color: string, size = 14) {
  g.popups.push({ text, x: Math.max(20, Math.min(W - 20, x)), y, t: 0.9, color, size });
}

function nextStage(g: Game) {
  g.log.push({ hits: g.stageHits, boss: isBossStage(g.stage) });
  g.stage += 1;
  g.stageTime = 0;
  g.stageHits = 0;
  if (isBossStage(g.stage)) {
    g.banner = { text: "WARNING", sub: "BOSS APPROACHING", color: "#ff2ea6", t: 2 };
    play(g, "boss");
  } else {
    g.banner = { text: `LEVEL ${stageLabel(g.stage)}`, color: "#ffd23f", t: 1.6 };
    play(g, "quest");
  }
}

function difficulty(g: Game): number {
  // Stages since the start, minus the boss stages, plus a step per loop
  return g.stage - Math.floor(g.stage / 4) + Math.floor(g.stage / 16) * 2;
}

function spawnObjection(g: Game, o: Objection, measure: Measure, speed: number, extra: Partial<Thing> = {}) {
  const w = Math.ceil(Math.max(measure(o.text, 14), measure(o.counter, 12))) + 10;
  let x = g.rng() * (W - w);
  // Don't land on top of one that just spawned: slide over (no extra RNG, so daily runs stay identical)
  for (let tries = 0; tries < 3; tries++) {
    const clash = g.things.some((t) => t.y < 40 && t.kind !== "power" && x < t.x + t.w + 4 && x + w > t.x - 4);
    if (!clash) break;
    x = (x + W * 0.37) % Math.max(1, W - w);
  }
  g.things.push({
    id: g.nextId++,
    kind: "objection",
    x,
    y: -ITEM_H,
    w,
    h: ITEM_H,
    vx: 0,
    vy: speed,
    text: o.text,
    counter: o.counter,
    typed: 0,
    objection: o,
    ...extra,
  });
}

function spawn(g: Game, measure: Measure, dt: number) {
  g.spawn -= dt;
  if (g.spawn > 0) return;
  const d = difficulty(g);
  const r = g.rng;
  const speed = 34 + d * 7 + r() * 26;
  if (r() < 0.11) {
    const power = POWER_KINDS[Math.floor(r() * POWER_KINDS.length)];
    g.things.push({ id: g.nextId++, kind: "power", x: 10 + r() * (W - 30), y: -14, w: 14, h: 14, vx: 0, vy: speed * 0.8, text: POWERUPS[power].glyph, counter: "", typed: 0, power });
  } else {
    spawnObjection(g, g.pool[Math.floor(r() * g.pool.length)], measure, speed);
  }
  g.spawn = Math.max(0.42, 1.25 - d * 0.08) * (0.7 + r() * 0.6);
}

// ── Bosses ─────────────────────────────────────────────────────────────────

function spawnBoss(g: Game) {
  const def = BOSSES[g.bossesBeaten % BOSSES.length];
  const loop = Math.floor(g.bossesBeaten / BOSSES.length);
  const words = [...def.words].sort(() => g.rng() - 0.5);
  const hp = def.hp + loop * 2;
  g.boss = { def, loop, hp, max: hp, x: W / 2, y: -40, vx: 26 + loop * 10, words, word: words[0], typed: 0, attack: 1.5, volley: 0, entering: true, hitT: 0 };
  g.banner = { text: def.name, sub: `"${def.taunt}"`, color: def.color, t: 2.4 };
  g.target = null;
}

function bossAttack(g: Game, b: Boss, measure: Measure) {
  const r = g.rng;
  b.volley += 1;
  switch (b.def.attack) {
    case "wall": {
      // A wall of NOs with one way through
      const gap = 52 - Math.min(b.loop * 5, 14);
      const gx = 8 + r() * (W - 16 - gap);
      const vy = 30 + b.loop * 6;
      const row = (x: number, w: number) => {
        if (w < 4) return;
        g.things.push({ id: g.nextId++, kind: "block", x, y: -14, w, h: 12, vx: 0, vy, text: "NOT INTERESTED · NO · ", counter: "", typed: 0 });
      };
      row(0, gx);
      row(gx + gap, W - gx - gap);
      b.attack = 2.9 - Math.min(b.loop * 0.3, 0.9);
      break;
    }
    case "spread": {
      // Redlines fanned at where you are
      const n = 5 + b.loop;
      const aim = Math.atan2(ROCKET_Y - (b.y + 16), g.x - b.x);
      for (let i = 0; i < n; i++) {
        const a = aim + (i - (n - 1) / 2) * 0.22;
        const v = 62 + b.loop * 8;
        g.things.push({ id: g.nextId++, kind: "bullet", x: b.x - 3, y: b.y + 16, w: 6, h: 6, vx: Math.cos(a) * v, vy: Math.sin(a) * v, text: "✕", counter: "", typed: 0 });
      }
      b.attack = 1.8 - Math.min(b.loop * 0.2, 0.6);
      break;
    }
    case "ghost": {
      // Objections you only see in flashes (and by their shadow)
      spawnObjection(g, g.pool[Math.floor(r() * g.pool.length)], measure, 36 + b.loop * 6 + r() * 14, { ghost: true });
      b.attack = 1.25 - Math.min(b.loop * 0.15, 0.4);
      break;
    }
    case "echo": {
      // Your own mistakes, back for another round
      const pool = g.hitBy.length ? g.hitBy : g.pool;
      spawnObjection(g, pool[Math.floor(r() * pool.length)], measure, 44 + b.loop * 6 + r() * 16);
      if (b.volley % 3 === 0) {
        for (let i = -1; i <= 1; i++) {
          g.things.push({ id: g.nextId++, kind: "bullet", x: b.x - 3, y: b.y + 16, w: 6, h: 6, vx: i * 26, vy: 70, text: "$", counter: "", typed: 0 });
        }
      }
      b.attack = 1.15 - Math.min(b.loop * 0.15, 0.4);
      break;
    }
  }
}

function damageBoss(g: Game) {
  const b = g.boss;
  if (!b || b.entering) return;
  b.hp -= 1;
  b.hitT = 0.3;
  g.shake = Math.max(g.shake, 5);
  g.flash = Math.max(g.flash, 0.35);
  g.freeze = 0.06;
  g.score += 500 * multiplier(g);
  g.combo += 1;
  g.bestCombo = Math.max(g.bestCombo, g.combo);
  popup(g, `+${500 * multiplier(g)}`, b.x, b.y + 30, b.def.color, 16);
  burst(g, b.x, b.y + 10, b.def.color, 24, 110);
  g.target = null;
  if (b.hp <= 0) {
    bossDown(g, b);
    return;
  }
  play(g, "bossHit");
  b.word = b.words[(b.max - b.hp) % b.words.length];
  b.typed = 0;
}

function bossDown(g: Game, b: Boss) {
  play(g, "bossDown");
  const bonus = 5000 * (b.loop + 1);
  g.score += bonus;
  g.bossesBeaten += 1;
  g.freeze = 0.5;
  g.shake = 10;
  g.flash = 1;
  for (let i = 0; i < 5; i++) burst(g, b.x + (Math.random() - 0.5) * 50, b.y + Math.random() * 24, i % 2 ? b.def.color : "#ffd23f", 40, 160);
  // The boss takes its attacks with it
  for (const t of g.things) if (t.kind !== "power") shatter(g, t, [b.def.color, "#f6f0ff"]);
  g.things = g.things.filter((t) => t.kind === "power");
  g.boss = null;
  g.target = null;
  popup(g, `BOSS DOWN +${bonus.toLocaleString("en-US")}`, W / 2, 100, "#ffd23f", 20);
  if (g.mode !== "demo") g.events.push({ type: "boss-down", boss: b.def });
  nextStage(g);
}

// ── Player actions ─────────────────────────────────────────────────────────

function kill(g: Game, t: Thing) {
  const m = multiplier(g);
  const points = (100 + t.counter.length * 25) * m;
  g.score += points;
  g.kos += 1;
  g.combo += 1;
  g.bestCombo = Math.max(g.bestCombo, g.combo);
  g.shake = Math.max(g.shake, 2);
  shatter(g, t, ["#ff2ea6", "#ffd1ec", "#ffd23f"]);
  popup(g, `${t.counter}! +${points}`, t.x + t.w / 2, t.y, "#ffd23f");
  g.things = g.things.filter((x) => x !== t);
  if (g.target === t.id) g.target = null;
  play(g, "kill");
}

function zapLine(g: Game, x: number, y: number, color = "#22e6ff") {
  g.lasers.push({ x1: g.x, y1: ROCKET_Y, x2: x, y2: y, t: 0.09, color });
  burst(g, x, y, color, 3, 40);
}

function miss(g: Game) {
  g.combo = 0;
  g.target = null;
  popup(g, "MISS", g.x, ROCKET_Y - 8, "#8b7bb5", 12);
  play(g, "miss");
}

/** A letter from the keyboard. Returns false when nothing could take it. */
export function typeKey(g: Game, raw: string): boolean {
  if (g.over || g.freeze > 0.2) return false;
  const ch = raw.toUpperCase();
  if (!/^[A-Z]$/.test(ch)) return false;
  const b = g.boss;

  if (g.target === BOSS_TARGET && b && !b.entering) {
    if (b.word[b.typed] !== ch) return miss(g), true;
    b.typed += 1;
    zapLine(g, b.x, b.y + 16, b.def.color);
    play(g, "zap");
    if (b.typed >= b.word.length) damageBoss(g);
    return true;
  }

  const locked = g.target !== null ? g.things.find((t) => t.id === g.target) : undefined;
  if (locked) {
    if (locked.counter[locked.typed] !== ch) return miss(g), true;
    locked.typed += 1;
    zapLine(g, locked.x + locked.w / 2, locked.y + locked.h);
    play(g, "zap");
    if (locked.typed >= locked.counter.length) kill(g, locked);
    return true;
  }

  // Lock on to the lowest objection whose counter starts with this letter
  let best: Thing | null = null;
  for (const t of g.things) {
    if (t.kind !== "objection" || t.y < -8 || t.counter[0] !== ch) continue;
    if (!best || t.y > best.y) best = t;
  }
  if (best) {
    best.typed = 1;
    g.target = best.id;
    zapLine(g, best.x + best.w / 2, best.y + best.h);
    play(g, "zap");
    if (best.typed >= best.counter.length) kill(g, best);
    return true;
  }
  if (b && !b.entering && b.word[0] === ch) {
    b.typed = 1;
    g.target = BOSS_TARGET;
    zapLine(g, b.x, b.y + 16, b.def.color);
    play(g, "zap");
    return true;
  }
  miss(g);
  return true;
}

/** Drop the current lock (backspace). */
export function unlockTarget(g: Game) {
  const t = g.things.find((x) => x.id === g.target);
  if (t) t.typed = 0;
  if (g.boss) g.boss.typed = 0;
  g.target = null;
}

/** A tap on touch screens: blasts what's under the finger. Returns whether it hit anything. */
export function tap(g: Game, x: number, y: number): boolean {
  if (g.over || g.tapCool > 0) return false;
  const b = g.boss;
  if (b && !b.entering && Math.abs(x - b.x) < 34 && y > b.y - 6 && y < b.y + 36) {
    g.tapCool = 0.7;
    zapLine(g, b.x, b.y + 16, b.def.color);
    play(g, "zap");
    damageBoss(g);
    return true;
  }
  const hit = g.things.find((t) => t.kind === "objection" && x > t.x - 8 && x < t.x + t.w + 8 && y > t.y - 8 && y < t.y + t.h + 8);
  if (!hit) return false;
  g.tapCool = 0.4;
  zapLine(g, hit.x + hit.w / 2, hit.y + hit.h);
  kill(g, hit);
  return true;
}

// ── The demo pilot (attract mode) ──────────────────────────────────────────

function autopilot(g: Game): number {
  let best = 0;
  let bestScore = Infinity;
  for (const dir of [-1, 0, 1]) {
    const fx = Math.max(10, Math.min(W - 10, g.x + dir * 160 * 0.3));
    let danger = Math.abs(fx - W / 2) * 0.002 + (dir === 0 ? 0 : 0.01);
    for (const t of g.things) {
      if (t.vy <= 0) continue;
      const tt = (ROCKET_Y - (t.y + t.h)) / t.vy;
      if (tt < -0.2 || tt > 1.3) continue;
      const tx = t.x + t.vx * Math.max(0, tt);
      const overlap = tx < fx + 14 && tx + t.w > fx - 14;
      if (!overlap) continue;
      danger += (t.kind === "power" ? -0.6 : 1) / (Math.max(0, tt) + 0.25);
    }
    if (danger < bestScore) {
      bestScore = danger;
      best = dir;
    }
  }
  return best;
}

function autotype(g: Game, real: number) {
  g.autoT -= real;
  if (g.autoT > 0) return;
  g.autoT = 0.11 + Math.random() * 0.12;
  if (g.target === BOSS_TARGET && g.boss) return void typeKey(g, g.boss.word[g.boss.typed]);
  const locked = g.things.find((t) => t.id === g.target);
  if (locked) return void typeKey(g, locked.counter[locked.typed]);
  const next = g.things.filter((t) => t.kind === "objection" && t.y > 10).sort((a, b) => b.y - a.y)[0];
  if (next) typeKey(g, next.counter[0]);
  else if (g.boss && !g.boss.entering) typeKey(g, g.boss.word[0]);
}

// ── The tick ───────────────────────────────────────────────────────────────

function updateFx(g: Game, real: number) {
  g.shake = Math.max(0, g.shake - real * 30);
  g.flash = Math.max(0, g.flash - real * 3);
  for (const p of g.particles) {
    p.x += p.vx * real;
    p.y += p.vy * real;
    p.vy += 160 * real;
    p.life -= real;
  }
  g.particles = g.particles.filter((p) => p.life > 0);
  if (g.particles.length > 600) g.particles.splice(0, g.particles.length - 600);
  for (const p of g.popups) {
    p.y -= 22 * real;
    p.t -= real;
  }
  g.popups = g.popups.filter((p) => p.t > 0);
  for (const l of g.lasers) l.t -= real;
  g.lasers = g.lasers.filter((l) => l.t > 0);
  for (const s of g.stars) {
    s.x -= real * (4 + s.s * 8);
    if (s.x < 0) s.x += W;
  }
  if (g.banner) {
    g.banner.t -= real;
    if (g.banner.t <= 0) g.banner = null;
  }
}

export function update(g: Game, real: number, input: { left: boolean; right: boolean }, measure: Measure) {
  updateFx(g, real);
  if (g.over) return;
  if (g.freeze > 0) {
    g.freeze -= real;
    return;
  }

  const dt = real * (g.slow > 0 ? 0.45 : 1) * (g.graze > 0 ? 0.4 : 1);
  g.time += dt;
  g.stageTime += dt;
  g.score += dt * 40 * (1 + difficulty(g) * 0.4);
  g.hurt = Math.max(0, g.hurt - real);
  g.slow = Math.max(0, g.slow - real);
  g.graze = Math.max(0, g.graze - real);
  g.tapCool = Math.max(0, g.tapCool - real);

  const dir = g.mode === "demo" ? autopilot(g) : (input.right ? 1 : 0) - (input.left ? 1 : 0);
  g.x = Math.max(10, Math.min(W - 10, g.x + dir * 165 * real));
  if (g.mode === "demo") autotype(g, real);

  // Stages
  if (isBossStage(g.stage)) {
    if (!g.boss && g.stageTime > 2) spawnBoss(g);
  } else {
    if (g.stageTime >= STAGE_SECONDS) nextStage(g);
    else if (g.stageTime > 0.8 || g.stage === 0) spawn(g, measure, dt);
  }

  const b = g.boss;
  if (b) {
    b.hitT = Math.max(0, b.hitT - real);
    if (b.entering) {
      b.y += 34 * dt;
      if (b.y >= 32) {
        b.y = 32;
        b.entering = false;
      }
    } else {
      b.x += b.vx * dt;
      if (b.x < 44 || b.x > W - 44) {
        b.vx *= -1;
        b.x = Math.max(44, Math.min(W - 44, b.x));
      }
      b.attack -= dt;
      if (b.attack <= 0) bossAttack(g, b, measure);
    }
  }

  // Falling things
  const px = g.x - 9;
  const py = ROCKET_Y;
  const survivors: Thing[] = [];
  for (const t of g.things) {
    if (t.dead) continue;
    t.x += t.vx * dt;
    t.y += t.vy * dt;
    const hit = t.x < px + 16 && t.x + t.w > px + 2 && t.y < py + 18 && t.y + t.h > py + 3;

    if (hit && t.kind === "power") {
      collect(g, t);
      continue;
    }
    if (hit && g.hurt <= 0) {
      hurt(g, t);
      continue;
    }
    if (!hit && !t.grazed && t.kind !== "power" && t.y < py + 20 && t.y + t.h > py) {
      const gap = t.x > px + 16 ? t.x - (px + 16) : px + 2 - (t.x + t.w);
      if (gap > 0 && gap < 7) {
        t.grazed = true;
        nearMiss(g, t);
      }
    }
    if (t.y > H || t.x + t.w < -20 || t.x > W + 20) {
      if (t.kind === "objection") g.score += 50;
      if (g.target === t.id) g.target = null;
      continue;
    }
    survivors.push(t);
  }
  g.things = survivors.filter((t) => !t.dead);

  if (g.lives <= 0) {
    g.over = true;
    g.log.push({ hits: g.stageHits, boss: isBossStage(g.stage), died: true });
    burst(g, g.x, ROCKET_Y + 10, "#ff2ea6", 60, 140);
    burst(g, g.x, ROCKET_Y + 10, "#ffd23f", 40, 100);
    g.shake = 12;
    g.flash = 1;
    play(g, "gameover");
    g.events.push({ type: "over" });
  }
}

function collect(g: Game, t: Thing) {
  const p = POWERUPS[t.power!];
  play(g, "powerup");
  if (t.power === "star") g.score += 500 * multiplier(g);
  if (t.power === "heart") g.lives = Math.min(5, g.lives + 1);
  if (t.power === "bolt") g.slow = 5;
  if (t.power === "clip") {
    // Receipts: every objection on screen folds at once
    for (const o of g.things) {
      if (o.kind === "power" || o.dead) continue;
      o.dead = true;
      shatter(g, o, ["#7dffb0", "#f6f0ff"]);
      if (o.kind === "objection") {
        g.score += 100 * multiplier(g);
        g.kos += 1;
      }
    }
    g.target = null;
    g.flash = 0.6;
    g.shake = 6;
  }
  g.banner = { text: p.label, color: p.color, t: 1.2 };
  burst(g, t.x + 7, t.y + 7, p.color, 18, 90);
}

function hurt(g: Game, t: Thing) {
  play(g, "hit");
  // The attract-mode pilot never runs out of runway: it's there to show off
  if (g.mode !== "demo") g.lives -= 1;
  g.hurt = 1.4;
  g.combo = 0;
  g.stageHits += 1;
  g.shake = 8;
  g.flash = 0.7;
  g.freeze = 0.08;
  const objection: Objection =
    t.objection ??
    (t.kind === "block"
      ? { text: "NOT INTERESTED", counter: "REFERRAL", move: "Cold walls crack with a warm name. Get the referral before you knock." }
      : g.boss
        ? { text: g.boss.def.name, counter: g.boss.def.words[0], move: g.boss.def.lesson }
        : { text: "REDLINE", counter: "PAPER", move: "Ask for the paper process on the first call, not the last one." });
  g.killer = objection;
  if (t.objection && !g.hitBy.includes(t.objection)) g.hitBy.push(t.objection);
  g.banner = { text: `${t.kind === "objection" ? t.text : objection.text}!`, color: "#ff2ea6", t: 1 };
  if (g.target === t.id) g.target = null;
  burst(g, g.x, ROCKET_Y + 8, "#ff2ea6", 30, 120);
}

function nearMiss(g: Game, t: Thing) {
  const points = 250 * multiplier(g);
  g.score += points;
  g.grazes += 1;
  g.combo += 1;
  g.bestCombo = Math.max(g.bestCombo, g.combo);
  g.graze = 0.22;
  burst(g, g.x + (t.x > g.x ? 8 : -8), ROCKET_Y + 10, "#22e6ff", 10, 60);
  popup(g, `NEAR MISS +${points}`, g.x, ROCKET_Y - 14, "#22e6ff", 13);
  play(g, "graze");
}

/** Today's daily run number, counted from launch day. */
export function dailyNumber(day: string): number {
  return Math.max(1, Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse("2026-10-01T00:00:00Z")) / 86400000) + 1);
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Wordle-style recap of a run. */
export function shareGrid(g: Game): string {
  return g.log
    .map((s) => (s.died ? "🟥" : s.boss ? "👾" : s.hits === 0 ? "🟩" : s.hits === 1 ? "🟨" : "🟧"))
    .join("");
}
