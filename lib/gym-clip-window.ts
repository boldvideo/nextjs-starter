/**
 * Where a coach clip starts and ends, from the transcript around a cited
 * moment. The answer only cites a ~10s statement; the clip should carry the
 * whole thought: start where the speaker's thought starts, end on a sentence
 * end about a minute later (or where their turn ends), never longer than two
 * minutes. Pure so it can move to the platform unchanged.
 */

export interface TranscriptWord {
  start: number;
  end: number;
  word: string;
}

export interface TranscriptUtterance {
  start: number;
  end: number;
  speaker?: string;
  words?: TranscriptWord[];
}

export interface Sentence {
  start: number;
  end: number;
  /** Index of the speaker turn (utterance) it belongs to */
  turn: number;
}

export interface ClipWindow {
  start: number;
  end: number;
}

/** A playable coach clip, as /api/gym/clip returns it */
export interface GymClip extends ClipWindow {
  /** Short video id (for links) */
  videoId: string;
  playbackId: string;
  title: string;
  /** Length of the whole session, in seconds */
  sessionDuration: number;
  /** Extra source params for the player (today: the instant-clip window) */
  params: { asset_start_time: number; asset_end_time: number };
}

const SENTENCE_END_RE = /[.?!]["”’')\]]*$/;

/** Lead-in before the cited sentence, at most this many seconds */
const MAX_LEAD = 12;
/** A speaker turn that starts this close before the citation becomes the start */
const TURN_SNAP = 15;
/** At least this long after the cited statement ends */
const MIN_AFTER = 15;
const MIN_LENGTH = 45;
const SOFT_MAX = 90;
const HARD_MAX = 120;

export function sentencesFrom(utterances: TranscriptUtterance[]): Sentence[] {
  const out: Sentence[] = [];
  utterances.forEach((u, turn) => {
    const words = u.words?.length ? u.words : [{ start: u.start, end: u.end, word: "." }];
    let start: number | null = null;
    words.forEach((w, i) => {
      if (start === null) start = w.start;
      if (SENTENCE_END_RE.test(w.word) || i === words.length - 1) {
        out.push({ start, end: w.end, turn });
        start = null;
      }
    });
  });
  return out;
}

export function clipWindow(
  sentences: Sentence[],
  turns: { start: number; end: number }[],
  citedStart: number,
  citedEnd: number,
  duration: number
): ClipWindow {
  const fallback = (): ClipWindow => {
    const start = Math.max(0, citedStart - 3);
    return { start, end: Math.min(duration || start + 60, start + 60) };
  };
  if (!sentences.length) return fallback();

  const i = sentences.findIndex((s) => s.end >= citedStart + 0.25);
  if (i === -1) return fallback();

  // Lead-in: up to two earlier sentences of the same turn, within MAX_LEAD
  let first = i;
  for (let k = 0; k < 2; k++) {
    const prev = sentences[first - 1];
    if (!prev || prev.turn !== sentences[i].turn || citedStart - prev.start > MAX_LEAD) break;
    first -= 1;
  }
  let start = sentences[first].start;
  const turn = turns[sentences[i].turn];
  if (turn && citedStart - turn.start <= TURN_SNAP) start = Math.min(start, turn.start);
  start = Math.max(0, start - 0.5);

  // End: the speaker's turn if it ends at a natural length, else the first
  // sentence end past the minimum, capped
  const minEnd = Math.max(Math.max(citedEnd, citedStart) + MIN_AFTER, start + MIN_LENGTH);
  let end: number;
  if (turn && turn.end >= Math.max(citedEnd + 10, start + 30) && turn.end <= start + SOFT_MAX) {
    end = turn.end;
  } else {
    const next = sentences.slice(i).find((s) => s.end >= minEnd);
    end = next ? next.end : minEnd;
  }
  end = Math.min(end, start + HARD_MAX);
  if (duration) end = Math.min(end + 0.3, duration);

  return { start: round(start), end: round(Math.max(end, start + 5)) };
}

const round = (n: number) => Math.round(n * 10) / 10;

/** "1:12" */
export function clipLength(clip: ClipWindow): string {
  const total = Math.max(0, Math.round(clip.end - clip.start));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** How long a clip is, the way the cards say it: "58 SEC", "1:12 MIN" */
export function clipLabel(clip: ClipWindow): string {
  const total = Math.max(0, Math.round(clip.end - clip.start));
  return total < 60 ? `${total} SEC` : `${clipLength(clip)} MIN`;
}

/** "a 58-minute session" */
export function sessionLabel(seconds: number): string {
  const min = Math.max(1, Math.round(seconds / 60));
  // "an 8-", "an 11-", "an 18-", "an 80-something-minute session"
  const an = [8, 11, 18].includes(min) || (min >= 80 && min <= 89);
  return `${an ? "an" : "a"} ${min}-minute session`;
}
