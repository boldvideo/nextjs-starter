import "server-only";

import { getTenantContext } from "@/lib/get-tenant-context";
import { parseRoast, pitchFromPrompt, type Roast, type RoastKind } from "@/lib/gym-roast";
import type { RoastSource } from "@/components/gym/gym-roast";

interface StoredSource {
  id: string;
  videoId: string;
  playbackId?: string;
  muxPlaybackId?: string;
  title?: string;
  videoTitle?: string;
  text?: string;
  timestamp?: number;
  timestampSeconds?: number;
  timestampEnd?: number;
  timestampEndSeconds?: number;
}

interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  sources?: StoredSource[];
}

export interface LoadedRoast {
  id: string;
  pitch: string;
  kind: RoastKind;
  text: string;
  roast: Roast;
  sources: RoastSource[];
}

/** A stored roast (a Bold conversation whose question is the roast prompt). */
export async function loadRoast(id: string): Promise<LoadedRoast | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const context = await getTenantContext();
  if (!context) return null;
  let messages: StoredMessage[] = [];
  try {
    const conversation = (await context.client.ai.getConversation(id)) as unknown as { messages?: StoredMessage[] };
    messages = conversation?.messages ?? [];
  } catch {
    return null;
  }
  const ask = messages.find((m) => m.role === "user");
  const answer = messages.find((m) => m.role === "assistant");
  const request = ask ? pitchFromPrompt(ask.content) : null;
  if (!request || !answer) return null;

  return {
    id,
    pitch: request.pitch,
    kind: request.kind,
    text: answer.content,
    roast: parseRoast(answer.content),
    sources: (answer.sources ?? []).map((s) => {
      const start = s.timestampSeconds ?? s.timestamp ?? 0;
      return {
        id: s.id,
        videoId: s.videoId,
        playbackId: s.playbackId ?? s.muxPlaybackId,
        title: s.videoTitle ?? s.title,
        startMs: Math.round(start * 1000),
        endMs: Math.round((s.timestampEndSeconds ?? s.timestampEnd ?? start) * 1000),
        text: s.text,
      };
    }),
  };
}
