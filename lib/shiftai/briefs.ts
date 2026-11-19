import data from "./briefs.json";
import type { Moment } from "./episode";

export interface BriefCell {
  text: string;
  /** Seconds into the episode, when the line could be tied to a real paragraph start. */
  at?: number | null;
}

/** The Shift newsletter's shape applied to one episode. Generated from the transcript, checked against it. */
export interface Brief {
  move: BriefCell;
  numbers: BriefCell;
  broke: BriefCell;
  advice: BriefCell;
}

interface Entry {
  brief?: Brief;
  moments?: Moment[];
  speakers?: Record<string, string>;
}

const all = data as Record<string, Entry>;

export const briefFor = (youtubeId: string): Brief | null => all[youtubeId]?.brief ?? null;
export const momentsFor = (youtubeId: string): Moment[] => all[youtubeId]?.moments ?? [];
