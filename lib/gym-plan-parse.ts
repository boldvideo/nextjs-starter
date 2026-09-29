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
