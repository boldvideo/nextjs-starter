import type { Metadata } from "next";
import { sharerName } from "@/lib/gym-share";
import { leadCoachSlug } from "@/lib/gym-coach-map";
import { getTenantContext } from "@/lib/get-tenant-context";
import { answerTeaser, gymMeta } from "@/lib/gym-meta";

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
  insertedAt?: string;
  sources?: { videoId?: string; muxPlaybackId?: string; playbackId?: string; cited?: boolean }[];
}

/**
 * A shared answer unfurls as the question on a LEVEL card, with the start of
 * the coach's answer as the description.
 */
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<{ by?: string }>;
}): Promise<Metadata> {
  const [{ conversationId }, sp] = await Promise.all([params, searchParams]);
  // Who shared it: "Marcel asked the coaches" on the card and in the title
  const by = sharerName(sp.by);
  const path = `/ask/${conversationId}`;

  try {
    const context = await getTenantContext();
    const conversation = (await context?.client.ai.getConversation(conversationId)) as
      | { messages?: HistoryMessage[]; metadata?: { originalQuery?: string } }
      | undefined;
    const messages = [...(conversation?.messages ?? [])].sort((a, b) => {
      const ta = a.insertedAt ? Date.parse(a.insertedAt) : 0;
      const tb = b.insertedAt ? Date.parse(b.insertedAt) : 0;
      if (ta !== tb) return ta - tb;
      return a.role === b.role ? 0 : a.role === "user" ? -1 : 1;
    });
    const question =
      messages.find((m) => m.role === "user")?.content?.trim() ||
      conversation?.metadata?.originalQuery?.trim();
    if (!question) return gymMeta({ path });

    const first = messages.find((m) => m.role === "assistant");
    const answer = first?.content;
    // The coach who answered goes on the card (a real face, not the robot)
    const coach = await leadCoachSlug(first?.sources).catch(() => null);
    return gymMeta({
      title: question,
      shareTitle: by ? `${by} asked the coaches: “${question}”` : `“${question}” — The GTM Game`,
      description: answerTeaser(answer) || "Real FounderWell coaches answer, with the clips to prove it.",
      path,
      image: `/og?q=${encodeURIComponent(question)}${by ? `&by=${encodeURIComponent(by)}` : ""}${coach ? `&coach=${coach}` : ""}`,
      imageAlt: `The GTM Game: “${question}”`,
      type: "article",
    });
  } catch {
    return gymMeta({ path });
  }
}

// Rendered by app/(default)/ask/layout.tsx
export default function AskConversationPage() {
  return null;
}
