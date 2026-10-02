/**
 * Roast my pitch: the prompt, the parser and the ranks. Shared by the API
 * route (builds the prompt), the cabinet (parses the stream) and the result
 * page + share card (parse the stored conversation).
 *
 * The prompt prescribes its own format, so prompt v2's rule 0 ("an explicit
 * format wins") lets it through: no moves, no next step, no detour.
 */

export const ROAST_KINDS = {
  "cold-email": "cold email",
  "linkedin-dm": "LinkedIn DM",
  pitch: "pitch line",
} as const;

export type RoastKind = keyof typeof ROAST_KINDS;

export const PITCH_MIN = 20;
export const PITCH_MAX = 2000;

export function isRoastKind(value: unknown): value is RoastKind {
  return typeof value === "string" && value in ROAST_KINDS;
}

/** Best guess when the player didn't pick: emails have a subject or a sign-off. */
export function guessKind(pitch: string): RoastKind {
  if (/^\s*subject\s*:/im.test(pitch) || /\n\s*(best|cheers|thanks|regards)[,!]?\s*\n/i.test(pitch)) return "cold-email";
  if (pitch.length < 160 && !pitch.includes("\n")) return "pitch";
  return pitch.length < 450 ? "linkedin-dm" : "cold-email";
}

const OPEN = "<<<";
const CLOSE = ">>>";

export function roastPrompt(kind: RoastKind, pitch: string): string {
  const label = ROAST_KINDS[kind];
  return [
    "ROAST MODE. Reply in exactly this format and nothing else: no intro, no outro, no headings, no markdown.",
    `Score this ${label} the way the coaches in the sessions would: how likely is it to get a reply? Judge only by what the sessions teach.`,
    "SCORE: a whole number from 0 to 100",
    "VERDICT: one playful, kind line in your Game Master voice, at most 18 words. Tease the pitch, never the person. Never name a person or company from the pitch (this line gets shared). No tough-guy talk.",
    `HIT: "at most 8 words quoted from the pitch" | the coach's rule that fixes it, one sentence, with a citation`,
    "(write 3 to 5 HIT lines, the costliest first; if the pitch is strong, a HIT can be what would make it even better)",
    "FIX:",
    "the rewritten version on the next lines: same channel, ready to send, under 90 words. It applies every HIT (cut what the hits call out), keeps their product and true facts, and uses [square brackets] only for details only the sender knows. No citations inside the fix.",
    "",
    `THE ${label.toUpperCase()} TO ROAST:`,
    OPEN,
    pitch.replaceAll(CLOSE, ">> >"),
    CLOSE,
  ].join("\n");
}

/** The player's pitch back out of the stored prompt (the conversation's user message). */
export function pitchFromPrompt(prompt: string): { kind: RoastKind; pitch: string } | null {
  if (!prompt.startsWith("ROAST MODE.")) return null;
  const start = prompt.indexOf(`\n${OPEN}\n`);
  const end = prompt.lastIndexOf(`\n${CLOSE}`);
  if (start === -1 || end <= start) return null;
  const label = prompt.match(/^THE (.+) TO ROAST:$/m)?.[1]?.toLowerCase() ?? "";
  const kind = (Object.keys(ROAST_KINDS) as RoastKind[]).find((k) => ROAST_KINDS[k].toLowerCase() === label) ?? "pitch";
  return { kind, pitch: prompt.slice(start + OPEN.length + 2, end) };
}

export interface RoastHit {
  /** The words from the pitch that cost replies */
  quote: string;
  /** The coach's rule, citation markers kept for clip lookup */
  rule: string;
}

export interface Roast {
  score: number | null;
  verdict: string;
  hits: RoastHit[];
  fix: string;
}

const REF_RE = /\[(?:\d+|c_[^\]]+)\]/g;

/**
 * Reads the roast format. Works on a partial stream (fields fill in as they
 * arrive) and tolerates the usual drift: bold labels, ";" or "→" instead of
 * "|", curly quotes, a missing quote.
 */
export function parseRoast(text: string): Roast {
  const clean = text.replace(/\*\*/g, "");
  const score = clean.match(/^\s*SCORE\s*:\s*(\d{1,3})/im);
  const verdict = clean.match(/^\s*VERDICT\s*:\s*(.+)$/im);

  const hits: RoastHit[] = [];
  for (const m of Array.from(clean.matchAll(/^\s*[-*]?\s*HIT\s*:\s*(.+)$/gim))) {
    const line = m[1].trim();
    const q = line.match(/^["“”'‘](.+?)["“”'’]\s*(?:[|;:→—–-]+\s*)?(.*)$/);
    if (q) hits.push({ quote: q[1].trim(), rule: q[2].trim() });
    else {
      const [quote, ...rest] = line.split(/\s*\|\s*/);
      hits.push(rest.length ? { quote: quote.replace(/^["“]|["”]$/g, ""), rule: rest.join(" ") } : { quote: "", rule: line });
    }
  }

  const fixAt = clean.search(/^\s*FIX\s*:/im);
  const fix = fixAt === -1 ? "" : clean.slice(fixAt).replace(/^\s*FIX\s*:\s*/i, "").replace(REF_RE, "").trim();

  return {
    score: score ? Math.max(0, Math.min(100, parseInt(score[1], 10))) : null,
    verdict: verdict ? verdict[1].replace(REF_RE, "").trim() : "",
    hits,
    fix,
  };
}

/** The citation ids a hit's rule leans on, in order. */
export function hitRefs(rule: string): string[] {
  return Array.from(rule.matchAll(/\[(c_[^\]]+)\]/g)).map((m) => m[1]);
}

export function stripRefs(text: string): string {
  return text.replace(REF_RE, "").replace(/\s+([.,!?;:])/g, "$1").trim();
}

export interface Rank {
  label: string;
  line: string;
  /** CSS color token for the score */
  color: string;
}

export function rankFor(score: number): Rank {
  if (score >= 90) return { label: "PERFECT RUN", line: "Send it. Then frame it.", color: "var(--gym-yellow)" };
  if (score >= 70) return { label: "HIGH SCORE", line: "Send-worthy. The fix makes it sharper.", color: "var(--gym-cyan)" };
  if (score >= 40) return { label: "CONTINUE?", line: "Close. One more pass and it's live.", color: "var(--gym-orange)" };
  return { label: "GAME OVER", line: "Insert a better opener. The fix is below.", color: "var(--gym-pink)" };
}
