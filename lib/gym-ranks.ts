/**
 * What XP is for: the player's rank. Each rank unlocks something real in the
 * game, so points have a goal. "Rank", not "level": a Level is one question
 * and its answer (CONCEPTS.md).
 *
 * The grand prize is FounderWell's call, not ours: it only shows when
 * PRIZE_LIVE is on, or as a preview with ?prize in the URL (for the pitch).
 */

export interface Rank {
  index: number;
  name: string;
  xp: number;
  /** What reaching it unlocks */
  perk: string;
  detail: string;
}

export const RANKS: Rank[] = [
  { index: 0, name: "Rookie", xp: 0, perk: "The arcade", detail: "Ask, watch the proof, do the quest." },
  { index: 1, name: "Contender", xp: 300, perk: "Coach chat", detail: "Ask a coach anything about the session behind a clip." },
  { index: 2, name: "Closer", xp: 1000, perk: "Objection Dodger", detail: "The secret level, no code needed." },
  { index: 3, name: "Rainmaker", xp: 2500, perk: "Gold player card", detail: "Your card and HUD go gold. Everyone will know." },
  { index: 4, name: "Legend", xp: 5000, perk: "Hall of fame", detail: "Top of the cabinet. Bragging rights, forever." },
];

export const COACH_CHAT_RANK = 1;
export const DODGER_RANK = 2;
export const GOLD_RANK = 3;

/** The FounderWell reward on the top rank (not agreed yet: keep off). */
export const PRIZE_LIVE = false;
export const PRIZE = {
  title: "A month of FounderWell, on us",
  detail: "Reach Legend and FounderWell unlocks a free month of the full program: every session, live coaching, the community.",
};

export function rankOf(xp: number): Rank {
  let rank = RANKS[0];
  for (const r of RANKS) if (xp >= r.xp) rank = r;
  return rank;
}

export function nextRank(xp: number): Rank | null {
  return RANKS.find((r) => r.xp > xp) ?? null;
}

/** 0–1 progress from the current rank to the next (1 at the top). */
export function rankProgress(xp: number): number {
  const now = rankOf(xp);
  const next = nextRank(xp);
  if (!next) return 1;
  return Math.min(1, Math.max(0, (xp - now.xp) / (next.xp - now.xp)));
}
