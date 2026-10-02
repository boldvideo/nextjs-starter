/**
 * Reads a coach answer as a training plan. The persona answers as
 * "take → bullets → one closing action"; this splits that shape into
 *   intro  the coach's take (paragraphs before the first bullet)
 *   drills the bullets
 *   notes  paragraphs after the bullets, except the last
 *   set    the closing action (last paragraph after the bullets)
 * Shared by the live answer (components/gym/gym-plan.tsx) and the printable
 * plan (app/(print)/plan). Anything that doesn't fit degrades to paragraphs.
 */

export type Block = { kind: "para"; text: string } | { kind: "item"; text: string };

const ITEM_RE = /^\s*(?:[-*•]|\d+[.)])\s+/;
const REF_RE = /\[(\d+|c_[^\]]+)\]/g;

export function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flushPara = () => {
    const text = para.join("\n").trim();
    if (text) blocks.push({ kind: "para", text });
    para = [];
  };

  for (const line of markdown.split("\n")) {
    if (ITEM_RE.test(line)) {
      flushPara();
      blocks.push({ kind: "item", text: line.replace(ITEM_RE, "") });
    } else if (!line.trim()) {
      flushPara();
    } else if (blocks.length && blocks[blocks.length - 1].kind === "item" && !para.length && /^\s{2,}/.test(line)) {
      // Indented continuation of a bullet
      blocks[blocks.length - 1].text += `\n${line.trim()}`;
    } else {
      para.push(line);
    }
  }
  flushPara();
  return blocks;
}

export function refsIn<T extends { id: string }>(text: string, citations: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const m of Array.from(text.matchAll(REF_RE))) {
    const ref = m[1];
    const c = ref.startsWith("c_")
      ? citations.find((x) => x.id === ref)
      : citations[parseInt(ref, 10) - 1];
    if (c && !seen.has(c.id)) {
      seen.add(c.id);
      out.push(c);
    }
  }
  return out;
}


export interface PlanParts {
  intro: string[];
  drills: string[];
  notes: string[];
  set: string | null;
}

export function splitPlan(markdown: string, streaming = false): PlanParts {
  const blocks = parseBlocks(markdown);
  const firstItem = blocks.findIndex((b) => b.kind === "item");
  if (firstItem === -1) {
    // No bullets: the take, then the last paragraph as the set (at rest only)
    const paras = blocks.map((b) => b.text);
    const hasSet = !streaming && paras.length >= 2;
    return {
      intro: hasSet ? paras.slice(0, -1) : paras,
      drills: [],
      notes: [],
      set: hasSet ? paras[paras.length - 1] : null,
    };
  }
  let lastItem = firstItem;
  blocks.forEach((b, i) => {
    if (b.kind === "item") lastItem = i;
  });
  const after = blocks.slice(lastItem + 1).map((b) => b.text);
  return {
    intro: blocks.slice(0, firstItem).map((b) => b.text),
    drills: blocks.slice(firstItem, lastItem + 1).map((b) => b.text),
    notes: after.slice(0, -1),
    set: after.length ? after[after.length - 1] : null,
  };
}

/**
 * One move, as prompt v2 writes it: "**Name.** what to do [c_x]", optionally
 * followed by the exact words to use as "> " lines (a line to say, or an
 * email/message line; an empty "> " line is a paragraph break). Moves from
 * older answers have no name and no words, just the body.
 */
export interface Move {
  name: string | null;
  body: string;
  say: string[];
}

const NAME_RE = /^\*\*(.+?)\*\*[ \t]*/;

export function parseMove(text: string): Move {
  const body: string[] = [];
  const say: string[] = [];
  for (const line of text.split("\n")) {
    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) say.push(quote[1].replace(REF_RE, "").replace(/\s+$/, ""));
    else if (line.trim()) body.push(line.trim());
  }
  let rest = body.join(" ");
  let name: string | null = null;
  const m = rest.match(NAME_RE);
  if (m) {
    name = m[1].trim().replace(/[.:]$/, "");
    rest = rest.slice(m[0].length);
  }
  // Drop leading/trailing paragraph breaks in the words
  while (say.length && !say[0].trim()) say.shift();
  while (say.length && !say[say.length - 1].trim()) say.pop();
  return { name, body: rest.trim(), say };
}

/** The closing action without its "Next step:" label (the UI supplies one). */
export function stripStepLabel(text: string): string {
  return text.replace(/^\s*\**\s*(?:next step|your next quest)\s*:\s*\**\s*/i, "");
}

/** The count a next step asks for ("your next 5 demos" → 5), if any. */
export function stepTarget(text: string): number | null {
  const m = text.match(/\b(?:next|to|on|for|send|call|book|run)\s+(\d{1,3})\b/i) ?? text.match(/\b(\d{1,3})\b/);
  const n = m ? parseInt(m[1], 10) : NaN;
  return n >= 2 && n <= 200 ? n : null;
}

/** Plain text for print: no citation refs, no markdown emphasis markers. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/\[(?:\d+|c_[^\]]+)\]/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|\s)[*_](.+?)[*_](?=\s|$|[.,!?])/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[ \t]+([.,!?;:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** A source line worth quoting as proof: skips filler like "And that was basically it." */
export function proofQuote(text?: string | null): string | null {
  const t = text?.trim();
  return t && t.split(/\s+/).length >= 8 ? t : null;
}

/**
 * Prompt detours: questions the library can't answer. The model marks them
 * with a leading <!-- detour --> comment, then writes one line and three
 * go-to-market questions to ask instead. The line decides the kind:
 *   off-the-map  no citation (paella)
 *   thin         one cited line (term sheets: the sessions only touch it)
 * Without the marker the shape is still recognized (no next step, short,
 * question bullets instead of named moves), so a forgotten marker never
 * becomes a fake quest.
 */
export interface Detour {
  kind: "off-the-map" | "thin";
  text: string;
  questions: string[];
}

const DETOUR_RE = /^\s*<!--\s*(detour|off-the-map|thin)\s*-->\s*/i;

export function parseDetour(markdown: string, streaming = false): Detour | null {
  const marked = markdown.match(DETOUR_RE);
  const body = marked ? markdown.slice(marked[0].length) : markdown;
  const blocks = parseBlocks(body);
  const questions = blocks
    .filter((b) => b.kind === "item")
    .map((b) => b.text.replace(/\*\*/g, "").trim())
    .filter(Boolean)
    .slice(0, 3);
  const text = blocks
    .filter((b) => b.kind === "para")
    .map((b) => b.text)
    .join("\n\n");

  if (marked) {
    const cited = /\[(?:\d+|c_[^\]]+)\]/.test(text);
    return { kind: cited ? "thin" : "off-the-map", text, questions };
  }
  if (streaming) return null;
  // Real answers end on "Next step:" with bold-named moves; a detour is a
  // short line plus question bullets
  const items = blocks.filter((b) => b.kind === "item").map((b) => b.text.trim());
  const unmarked =
    !/next step\s*:/i.test(body) &&
    items.length >= 2 &&
    items.length <= 4 &&
    !items.some((i) => i.startsWith("**")) &&
    items.filter((i) => i.endsWith("?")).length >= items.length - 1 &&
    body.split(/\s+/).length <= 130;
  if (!unmarked) return null;
  const cited = /\[(?:\d+|c_[^\]]+)\]/.test(text);
  return { kind: cited ? "thin" : "off-the-map", text, questions };
}

/** Strip a detour marker anywhere it would otherwise render as text. */
export function stripDetourMarker(markdown: string): string {
  return markdown.replace(DETOUR_RE, "");
}
