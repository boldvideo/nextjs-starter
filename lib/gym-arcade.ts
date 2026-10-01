"use client";

import { useSyncExternalStore } from "react";

/**
 * The arcade's machine state, per browser: the 1UP score (XP),
 * achievements, sound, secret mode and the Objection Dodger high scores.
 * localStorage-backed (a nice-to-have: everything works without it) and
 * read through useSyncExternalStore so every HUD stays in sync.
 */

export interface HighScore {
  initials: string;
  score: number;
  /** House scores ship with the machine; players push them down */
  house?: boolean;
}

export interface ArcadeState {
  xp: number;
  sound: boolean;
  secret: boolean;
  achievements: Record<string, number>;
  scores: HighScore[];
  /** "Select difficulty": the founder's stage, sent with every question */
  stage: string | null;
  /** Levels started in this browser (the coin gate counts these) */
  plays: number;
  /** The questions behind those levels, handed to FounderWell with the coin */
  questions: string[];
  /** An email went in the slot (or they signed in): no more gate */
  coin: boolean;
  /** Best daily-run score per day (YYYY-MM-DD) */
  dailyBest: Record<string, number>;
}

export interface Achievement {
  id: string;
  title: string;
  detail: string;
  xp: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "press-start", title: "Press start", detail: "Asked your first question.", xp: 100 },
  { id: "quest", title: "Quest complete", detail: "Did the thing. Most people just read it.", xp: 0 },
  { id: "combo", title: "Combo x3", detail: "Three levels in one game.", xp: 300 },
  { id: "replay", title: "Instant replay", detail: "Watched the proof.", xp: 50 },
  { id: "guide", title: "Strategy guide", detail: "Printed the cheat sheet. Old school.", xp: 150 },
  { id: "player-2", title: "Player 2 has entered", detail: "Shared your run.", xp: 150 },
  { id: "random", title: "Feeling lucky", detail: "Rolled a random level.", xp: 25 },
  { id: "konami", title: "You know the code", detail: "↑↑↓↓←→←→BA. Respect.", xp: 1000 },
  { id: "night-owl", title: "Night owl", detail: "The arcade never closes. You should, though.", xp: 100 },
  { id: "tilt", title: "Tilt!", detail: "Stop shaking the machine.", xp: 50 },
  { id: "boss", title: "Boss slayer", detail: "Scored 5,000 in Objection Dodger.", xp: 500 },
  { id: "player-card", title: "Player card", detail: "Signed in. The coach knows your name now.", xp: 200 },
  { id: "boss-gatekeeper", title: "Past the front desk", detail: "Beat the Gatekeeper.", xp: 300 },
  { id: "boss-procurement", title: "Form 27-B, filed", detail: "Beat Procurement.", xp: 400 },
  { id: "boss-ghosted", title: "Unghosted", detail: "Beat Ghosted.", xp: 500 },
  { id: "boss-cfo", title: "CFO approved", detail: "Beat the CFO. The money said yes.", xp: 1000 },
  { id: "closer", title: "Closer", detail: "Blasted 25 objections in one run.", xp: 300 },
  { id: "near-miss", title: "Living dangerously", detail: "10 near misses in one run.", xp: 200 },
  { id: "combo-king", title: "Combo x8", detail: "Maxed the multiplier.", xp: 400 },
  { id: "intel", title: "They know you", detail: "Dodged your own buyers' objections.", xp: 250 },
  { id: "daily", title: "Daily grind", detail: "Played the daily run.", xp: 100 },
];

const HOUSE_SCORES: HighScore[] = [
  { initials: "VAN", score: 25000, house: true },
  { initials: "CAM", score: 18000, house: true },
  { initials: "DRW", score: 15000, house: true },
  { initials: "JOL", score: 12000, house: true },
  { initials: "MRC", score: 9000, house: true },
];

const KEY = "gtm-game:v1";

const INITIAL: ArcadeState = {
  xp: 0,
  sound: false,
  secret: false,
  achievements: {},
  scores: HOUSE_SCORES,
  stage: null,
  plays: 0,
  questions: [],
  coin: false,
  dailyBest: {},
};

/** Free levels before the coin. */
export const FREE_PLAYS = 3;

let state: ArcadeState = INITIAL;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...INITIAL, ...JSON.parse(raw) };
  } catch {
    /* private mode: play without saving */
  }
}

function set(next: Partial<ArcadeState>) {
  load();
  state = { ...state, ...next };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): ArcadeState {
  load();
  return state;
}

export function useArcade(): ArcadeState {
  return useSyncExternalStore(subscribe, getSnapshot, () => INITIAL);
}

// ── Events the overlay listens to (toasts, coin bursts, the secret level) ──

export type ArcadeEvent =
  | { type: "xp"; amount: number; label: string }
  | { type: "achievement"; achievement: Achievement }
  | { type: "secret"; on: boolean }
  | { type: "dodger" };

const EVENT = "gtm-game:event";

export function emit(event: ArcadeEvent) {
  window.dispatchEvent(new CustomEvent<ArcadeEvent>(EVENT, { detail: event }));
}

export function onArcadeEvent(handler: (event: ArcadeEvent) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<ArcadeEvent>).detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

// ── Actions ────────────────────────────────────────────────────────────────

export function addXp(amount: number, label: string) {
  set({ xp: getSnapshot().xp + amount });
  emit({ type: "xp", amount, label });
}

/** First time only; returns whether it was new. */
export function unlock(id: string): boolean {
  const current = getSnapshot();
  if (current.achievements[id]) return false;
  const achievement = ACHIEVEMENTS.find((a) => a.id === id);
  if (!achievement) return false;
  set({
    achievements: { ...current.achievements, [id]: Date.now() },
    xp: current.xp + achievement.xp,
  });
  emit({ type: "achievement", achievement });
  sfx("achievement");
  return true;
}

export function toggleSound() {
  const sound = !getSnapshot().sound;
  set({ sound });
  if (sound) sfx("start");
}

export function setSecret(on: boolean) {
  set({ secret: on });
  emit({ type: "secret", on });
}

export function setStage(stage: string | null) {
  set({ stage });
  sfx("select");
}

export function getStage(): string | null {
  return getSnapshot().stage;
}

export function recordPlay(question: string) {
  const current = getSnapshot();
  set({ plays: current.plays + 1, questions: [...current.questions, question.slice(0, 500)].slice(-10) });
}

export function markCoin() {
  set({ coin: true });
}

/** True when the next level needs a coin first. */
export function needsCoin(): boolean {
  const { plays, coin } = getSnapshot();
  return !coin && plays >= FREE_PLAYS;
}

export function openDodger() {
  emit({ type: "dodger" });
}

export function qualifies(score: number): boolean {
  const scores = getSnapshot().scores;
  return score > 0 && (scores.length < 8 || score > scores[scores.length - 1].score);
}

export function recordDaily(day: string, score: number) {
  const dailyBest = getSnapshot().dailyBest;
  if ((dailyBest[day] ?? 0) >= score) return;
  // Keep a week of days
  const kept = Object.entries(dailyBest).sort(([a], [b]) => b.localeCompare(a)).slice(0, 6);
  set({ dailyBest: { ...Object.fromEntries(kept), [day]: score } });
}

export function addHighScore(initials: string, score: number) {
  const scores = [...getSnapshot().scores, { initials, score }]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  set({ scores });
}

// ── Sound: original square-wave blips, synthesized, muted by default ─────

export type Sfx =
  | "coin"
  | "start"
  | "select"
  | "quest"
  | "achievement"
  | "hit"
  | "powerup"
  | "gameover"
  | "zap"
  | "kill"
  | "graze"
  | "miss"
  | "boss"
  | "bossHit"
  | "bossDown";

let ctx: AudioContext | null = null;

/** The shared audio context, or null while the machine is muted. */
export function audio(): AudioContext | null {
  if (typeof window === "undefined" || !getSnapshot().sound) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

const NOTES: Record<Sfx, { f: number; d: number; type?: OscillatorType }[]> = {
  coin: [{ f: 988, d: 0.07 }, { f: 1319, d: 0.22 }],
  start: [{ f: 523, d: 0.07 }, { f: 659, d: 0.07 }, { f: 784, d: 0.07 }, { f: 1047, d: 0.16 }],
  select: [{ f: 880, d: 0.04 }],
  quest: [{ f: 784, d: 0.08 }, { f: 988, d: 0.08 }, { f: 1175, d: 0.08 }, { f: 1568, d: 0.2 }],
  achievement: [{ f: 659, d: 0.09 }, { f: 784, d: 0.09 }, { f: 1319, d: 0.09 }, { f: 1047, d: 0.09 }, { f: 1175, d: 0.09 }, { f: 1568, d: 0.24 }],
  hit: [{ f: 196, d: 0.06, type: "sawtooth" }, { f: 131, d: 0.14, type: "sawtooth" }],
  powerup: [{ f: 392, d: 0.05 }, { f: 523, d: 0.05 }, { f: 659, d: 0.05 }, { f: 784, d: 0.05 }, { f: 1047, d: 0.05 }, { f: 1319, d: 0.12 }],
  gameover: [{ f: 494, d: 0.18 }, { f: 440, d: 0.18 }, { f: 392, d: 0.18 }, { f: 294, d: 0.5, type: "triangle" }],
  zap: [{ f: 1760, d: 0.025 }],
  kill: [{ f: 1047, d: 0.04 }, { f: 1568, d: 0.04 }, { f: 2093, d: 0.08 }],
  graze: [{ f: 2637, d: 0.03, type: "triangle" }, { f: 3136, d: 0.05, type: "triangle" }],
  miss: [{ f: 110, d: 0.06, type: "sawtooth" }],
  boss: [{ f: 147, d: 0.22, type: "sawtooth" }, { f: 139, d: 0.22, type: "sawtooth" }, { f: 147, d: 0.22, type: "sawtooth" }, { f: 98, d: 0.5, type: "sawtooth" }],
  bossHit: [{ f: 220, d: 0.05, type: "sawtooth" }, { f: 880, d: 0.06 }],
  bossDown: [{ f: 523, d: 0.08 }, { f: 659, d: 0.08 }, { f: 784, d: 0.08 }, { f: 1047, d: 0.08 }, { f: 784, d: 0.08 }, { f: 1047, d: 0.08 }, { f: 1319, d: 0.08 }, { f: 1568, d: 0.4 }],
};

export function sfx(name: Sfx) {
  const ctx = audio();
  if (!ctx) return;
  try {
    let t = ctx.currentTime + 0.01;
    for (const note of NOTES[name]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = note.type ?? "square";
      osc.frequency.setValueAtTime(note.f, t);
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + note.d);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + note.d);
      t += note.d * 0.92;
    }
  } catch {
    /* no audio, no problem */
  }
}

/** Six digits, zero-padded, like the machine. */
export function score6(n: number): string {
  return String(Math.min(999999, Math.max(0, Math.floor(n)))).padStart(6, "0");
}
