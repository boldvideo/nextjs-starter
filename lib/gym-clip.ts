import "server-only";

import { getTenantContext } from "@/lib/get-tenant-context";
import { clipWindow, sentencesFrom, type GymClip, type Sentence, type TranscriptUtterance } from "@/lib/gym-clip-window";

export type { GymClip };

/**
 * Coach clips instead of whole sessions. Given a cited moment, returns what
 * the player needs to play only that thought: Mux instant clipping
 * (asset_start_time/asset_end_time), no re-encoding.
 *
 * The client never builds Mux URLs itself: it plays `params` as the player's
 * extra source params. Today those are plain clip params on the public
 * playback ID (anyone can strip them); with signed playback the platform
 * returns tokens with the window inside the JWT instead, and only this
 * module and the player prop change.
 */

interface SessionTape {
  videoId: string;
  playbackId: string;
  title: string;
  duration: number;
  sentences: Sentence[];
  turns: { start: number; end: number }[];
}

// Instances are reused across requests (Fluid Compute): keep parsed
// transcripts around instead of refetching them for every clip
const TTL = 60 * 60 * 1000;
const tapes = new Map<string, { at: number; tape: Promise<SessionTape | null> }>();

async function loadTape(videoRef: string): Promise<SessionTape | null> {
  const context = await getTenantContext();
  if (!context) return null;
  try {
    const { data } = await context.client.videos.get(videoRef);
    const video = data as typeof data & { transcript?: { json?: { url?: string } } };
    if (!video?.playbackId) return null;

    let utterances: TranscriptUtterance[] = [];
    const url = video.transcript?.json?.url;
    if (url) {
      const res = await fetch(url, { next: { revalidate: 86400 } });
      if (res.ok) utterances = ((await res.json()) as { utterances?: TranscriptUtterance[] }).utterances ?? [];
    }
    return {
      videoId: video.id,
      playbackId: video.playbackId,
      title: video.title,
      duration: video.duration ?? 0,
      sentences: sentencesFrom(utterances),
      turns: utterances.map((u) => ({ start: u.start, end: u.end })),
    };
  } catch {
    return null;
  }
}

function tapeFor(videoRef: string): Promise<SessionTape | null> {
  const hit = tapes.get(videoRef);
  if (hit && Date.now() - hit.at < TTL) return hit.tape;
  const tape = loadTape(videoRef);
  tapes.set(videoRef, { at: Date.now(), tape });
  tape.then((t) => {
    if (!t) tapes.delete(videoRef);
  });
  if (tapes.size > 200) tapes.delete(tapes.keys().next().value as string);
  return tape;
}

/** The clip around a cited moment (seconds into the session). */
export async function resolveClip(videoRef: string, citedStart: number, citedEnd: number): Promise<GymClip | null> {
  const tape = await tapeFor(videoRef);
  if (!tape) return null;
  const { start, end } = clipWindow(tape.sentences, tape.turns, citedStart, citedEnd, tape.duration);
  return {
    videoId: tape.videoId,
    playbackId: tape.playbackId,
    title: tape.title,
    start,
    end,
    params: { asset_start_time: start, asset_end_time: end },
  };
}
