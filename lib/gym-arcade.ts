"use client";

import { useSyncExternalStore } from "react";
import { DODGER_RANK, rankOf, type Rank } from "@/lib/gym-ranks";

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

export type QuestStatus = "next" | "doing" | "done";

/** A next step saved to the quest board, to come back to. */
export interface Quest {
  id: string;
  /** The quest as plain text */
  text: string;
  /** Coach slug, for the face on the card */
  coach: string | null;
  /** The count it asks for ("talk to 5 founders" → 5), if any */
  target: number | null;
  progress: number;
  status: QuestStatus;
  savedAt: number;
  doneAt?: number;
  /** The answer it came from (/ask/<id>) */
  link: string | null;
  /** Completion XP already paid (undo and redo doesn't farm it) */
  paid?: boolean;
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
  /** The quest board, newest first */
  quests: Quest[];
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
  { id: "guide", title: "Playbook", detail: "Opened your playbook. Old school.", xp: 150 },
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
  { id: "saved", title: "Save point", detail: "Saved a quest for later. Now come back.", xp: 50 },
  { id: "office-hours", title: "Office hours", detail: "Asked a coach about their session.", xp: 100 },
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
  quests: [],
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
  | { type: "rank"; rank: Rank }
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

/** XP changes go through here: crossing a rank threshold is an event. */
function setXp(xp: number, rest: Partial<ArcadeState> = {}) {
  const before = rankOf(getSnapshot().xp);
  set({ ...rest, xp });
  const after = rankOf(xp);
  if (after.index > before.index) {
    // After the XP toast, not on top of it
    setTimeout(() => {
      emit({ type: "rank", rank: after });
      sfx("powerup");
    }, 700);
  }
}

export function addXp(amount: number, label: string) {
  setXp(getSnapshot().xp + amount);
  emit({ type: "xp", amount, label });
}

/** First time only; returns whether it was new. */
export function unlock(id: string): boolean {
  const current = getSnapshot();
  if (current.achievements[id]) return false;
  const achievement = ACHIEVEMENTS.find((a) => a.id === id);
  if (!achievement) return false;
  setXp(current.xp + achievement.xp, { achievements: { ...current.achievements, [id]: Date.now() } });
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

/** Log out: the next level past the free ones asks for a coin again. */
export function forgetCoin() {
  set({ coin: false });
}

export function markCoin() {
  set({ coin: true });
}

/** True when the next level needs a coin first. */
export function needsCoin(): boolean {
  const { plays, coin } = getSnapshot();
  return !coin && plays >= FREE_PLAYS;
}

/** The Objection Dodger: found with the code, or earned with rank. */
export function hasDodger(state: ArcadeState): boolean {
  return state.secret || rankOf(state.xp).index >= DODGER_RANK;
}

// ── The quest board ────────────────────────────────────────────────────────

const sameQuest = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function findQuest(text: string): Quest | undefined {
  return getSnapshot().quests.find((q) => sameQuest(q.text, text));
}

/** Save a quest to the board (once per text). Returns the board's copy. */
export function saveQuest(
  input: { text: string; coach: string | null; target: number | null; link: string | null },
  { quiet = false }: { quiet?: boolean } = {}
): Quest {
  const existing = findQuest(input.text);
  if (existing) return existing;
  const quest: Quest = {
    id: `q${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    text: input.text.slice(0, 600),
    coach: input.coach,
    target: input.target,
    progress: 0,
    status: "next",
    savedAt: Date.now(),
    link: input.link,
  };
  // Keep the board a board, not an archive
  set({ quests: [quest, ...getSnapshot().quests].slice(0, 60) });
  if (!quiet) unlock("saved");
  return quest;
}

function patchQuest(id: string, patch: Partial<Quest>) {
  set({ quests: getSnapshot().quests.map((q) => (q.id === id ? { ...q, ...patch } : q)) });
}

/** Move a quest across the board. Done pays the quest XP, once per quest. */
export function moveQuest(id: string, status: QuestStatus) {
  const quest = getSnapshot().quests.find((q) => q.id === id);
  if (!quest || quest.status === status) return;
  if (status !== "done") {
    patchQuest(id, { status, doneAt: undefined });
    return;
  }
  patchQuest(id, {
    status,
    doneAt: Date.now(),
    progress: quest.target ? Math.max(quest.progress, quest.target) : quest.progress,
    paid: true,
  });
  sfx("quest");
  if (!quest.paid) addXp(100, "QUEST");
  unlock("quest");
}

/** Count one more (or one less) toward the quest's target. */
export function stepQuest(id: string, delta: number) {
  const quest = getSnapshot().quests.find((q) => q.id === id);
  if (!quest) return;
  const progress = Math.max(0, Math.min(quest.target ?? 999, quest.progress + delta));
  patchQuest(id, { progress, status: quest.status === "next" && progress > 0 ? "doing" : quest.status });
  if (delta > 0) sfx("coin");
}

export function dropQuest(id: string) {
  set({ quests: getSnapshot().quests.filter((q) => q.id !== id) });
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
