/**
 * What falls from the sky. Each objection carries its counter (the word you
 * type to blast it) and the coach's move, shown when it's the one that got
 * you. The house set ships with the machine; a player's own set comes from
 * the coach (app/api/gym/dodger/objections) and swaps in mid-game.
 */

export interface Clip {
  playbackId: string;
  start: number;
  end: number;
  title: string;
  coach?: string | null;
}

export interface Objection {
  text: string;
  counter: string;
  move: string;
  clip?: Clip | null;
}

export const HOUSE: Objection[] = [
  { text: "SEND ME SOME INFO", counter: "CALL", move: "Don't send a deck into the void. Book the next step while they're on the phone." },
  { text: "NO BUDGET", counter: "ROI", move: "Budget follows pain. Price the problem before you price the product." },
  { text: "CIRCLE BACK IN Q3", counter: "NOW", move: "Ask what changes in Q3. If nothing does, the cost of waiting is your pitch." },
  { text: "NOT A PRIORITY", counter: "PAIN", move: "Find the pain they already rank. Tie yourself to it or move on." },
  { text: "WE BUILD IN-HOUSE", counter: "FOCUS", move: "Name the self-build option first, then show what their engineers won't ship instead." },
  { text: "TOO EXPENSIVE", counter: "VALUE", move: "Compared to what? Anchor on the outcome, not the line item." },
  { text: "LOOP IN LEGAL", counter: "PAPER", move: "Ask for the paper process on the first call, not the last one." },
  { text: "JUST BROWSING", counter: "WHY", move: "Nobody browses on purpose. Ask what made today the day they looked." },
  { text: "PER MY LAST EMAIL", counter: "SORRY", move: "Own the miss in one line, then give them something they can say yes to." },
  { text: "WE USE A SPREADSHEET", counter: "SWITCH", move: "The spreadsheet is your real competitor. Show the moment it breaks." },
  { text: "WHO ARE YOU?", counter: "PROOF", move: "Lead with a name they know and a result they want, in that order." },
  { text: "BAD TIMING", counter: "WHEN", move: "Get a date, not a maybe. Then earn the right to that date." },
  { text: "ASK MY BOSS", counter: "CHAMP", move: "Arm your champion: one page, their words, the number their boss cares about." },
  { text: "WE TRIED THAT", counter: "STORY", move: "Ask what went wrong last time. Their story is your positioning." },
];

export type Attack = "wall" | "spread" | "ghost" | "echo";

export interface BossDef {
  id: string;
  name: string;
  taunt: string;
  color: string;
  hp: number;
  words: string[];
  attack: Attack;
  /** The coach's tape you win for beating it (a library search) */
  clipQuery: string;
  /** What the tape teaches, one line */
  lesson: string;
  achievement: string;
}

export const BOSSES: BossDef[] = [
  {
    id: "gatekeeper",
    name: "THE GATEKEEPER",
    taunt: "HE'S IN A MEETING.",
    color: "#22e6ff",
    hp: 5,
    words: ["REFERRAL", "VALUE", "CALLBACK", "WARM", "RESEARCH", "NAMEDROP"],
    attack: "wall",
    clipQuery: "how to reach the economic buyer instead of a gatekeeper",
    lesson: "Finding the person who actually decides, before you knock.",
    achievement: "boss-gatekeeper",
  },
  {
    id: "procurement",
    name: "PROCUREMENT",
    taunt: "PLEASE FILL OUT FORM 27-B.",
    color: "#ffd23f",
    hp: 6,
    words: ["CHAMPION", "SECURITY", "TIMELINE", "MUTUAL", "PAPER", "SIGNOFF"],
    attack: "spread",
    clipQuery: "multiple stakeholders buying committee sign off",
    lesson: "Selling to the whole buying committee, not just your champion.",
    achievement: "boss-procurement",
  },
  {
    id: "ghosted",
    name: "GHOSTED",
    taunt: "SEEN 3 WEEKS AGO.",
    color: "#b58cff",
    hp: 6,
    words: ["BREAKUP", "NUDGE", "VIDEO", "DEADLINE", "BUMP", "REVIVE"],
    attack: "ghost",
    clipQuery: "prospect ghosted me after the demo",
    lesson: "Why great demos go silent, and the urgency that brings them back.",
    achievement: "boss-ghosted",
  },
  {
    id: "cfo",
    name: "THE CFO",
    taunt: "WHAT'S THE ROI ON THIS MEETING?",
    color: "#ff2ea6",
    hp: 7,
    words: ["PAYBACK", "NUMBERS", "SAVINGS", "PROOF", "CASE", "MARGIN"],
    attack: "echo",
    clipQuery: "justify the price with ROI numbers",
    lesson: "Pricing on value, so the money person says yes.",
    achievement: "boss-cfo",
  },
];

/** A–Z only, so every counter can be typed on any keyboard. */
export function cleanCounter(word: string): string {
  return word.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 9);
}
