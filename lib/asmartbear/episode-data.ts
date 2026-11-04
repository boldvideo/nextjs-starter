import "server-only";

import { unstable_cache } from "next/cache";

// Turns Bold's transcript JSON into readable paragraphs. AssemblyAI only breaks
// an utterance when the speaker changes, so a 10-minute monologue arrives as
// one block. We re-break on the word timings: a new paragraph on a speaker
// change, a pause of PAUSE_S, or a sentence end once the paragraph is long
// enough. Each paragraph keeps the start time of its first word.

const PAUSE_S = 1.5;
const SOFT_WORDS = 55;
const HARD_WORDS = 130;

export interface Paragraph {
  speaker: string;
  start: number;
  text: string;
}

export interface Chapter {
  start: number;
  end: number;
  title: string;
}

interface Word {
  word?: string;
  text?: string;
  start: number;
  end: number;
}

interface Utterance {
  speaker: string;
  start: number;
  text: string;
  words?: Word[];
}

interface TranscriptJson {
  metadata?: { speakers?: Record<string, string | null> };
  utterances?: Utterance[];
}

const SENTENCE_END = /[.!?]["”’)]?$/;

export function paragraphs(json: TranscriptJson): Paragraph[] {
  const names = json.metadata?.speakers ?? {};
  const out: Paragraph[] = [];

  for (const u of json.utterances ?? []) {
    const speaker = names[u.speaker] || `Speaker ${u.speaker}`;
    const words = u.words ?? [];
    if (words.length === 0) {
      out.push({ speaker, start: u.start, text: u.text });
      continue;
    }

    let buf: string[] = [];
    let start = words[0].start;
    let prevEnd = words[0].start;

    const flush = () => {
      if (buf.length) out.push({ speaker, start, text: buf.join(" ") });
      buf = [];
    };

    for (const w of words) {
      const token = (w.word ?? w.text ?? "").trim();
      if (!token) continue;
      const pause = w.start - prevEnd;
      const lastToken = buf[buf.length - 1] ?? "";
      const atSentenceEnd = SENTENCE_END.test(lastToken);
      if (
        buf.length > 0 &&
        ((pause >= PAUSE_S && atSentenceEnd) ||
          (buf.length >= SOFT_WORDS && atSentenceEnd && pause >= 0.35) ||
          (buf.length >= HARD_WORDS && atSentenceEnd))
      ) {
        flush();
        start = w.start;
      }
      buf.push(token);
      prevEnd = w.end;
    }
    flush();
  }

  // Merge tiny same-speaker fragments ("Yeah." "Right.") into their neighbour.
  return out.reduce<Paragraph[]>((acc, p) => {
    const last = acc[acc.length - 1];
    if (last && last.speaker === p.speaker && last.text.split(" ").length < 6) {
      last.text = `${last.text} ${p.text}`;
      return acc;
    }
    acc.push({ ...p });
    return acc;
  }, []);
}

function seconds(ts: string): number {
  const [hms, ms = "0"] = ts.trim().split(".");
  const parts = hms.split(":").map(Number);
  const s = parts.reduce((total, n) => total * 60 + n, 0);
  return s + Number(`0.${ms}`);
}

export function parseChapters(webvtt?: string | null): Chapter[] {
  if (!webvtt || !webvtt.includes("-->")) return [];
  const chapters: Chapter[] = [];
  for (const block of webvtt.split(/\n\s*\n/)) {
    const lines = block.trim().split("\n");
    const cue = lines.findIndex((l) => l.includes("-->"));
    if (cue < 0) continue;
    const [a, b] = lines[cue].split("-->");
    const title = lines.slice(cue + 1).join(" ").trim();
    if (title) chapters.push({ start: seconds(a), end: seconds(b), title });
  }
  return chapters;
}

// The raw transcript JSON (words + timings) runs past Next's 2 MB fetch-cache
// limit for a 2-hour episode, so cache the paragraphs (~130 KB) instead.
export const transcriptParagraphs = unstable_cache(
  async (url: string): Promise<Paragraph[]> => {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    return paragraphs((await res.json()) as TranscriptJson);
  },
  ["asb-paragraphs-v1"],
  { revalidate: 3600 }
);

