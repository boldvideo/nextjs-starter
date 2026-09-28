import type { Metadata } from "next";
import { getTenantContext } from "@/lib/get-tenant-context";
import { answerTeaser, gymMeta } from "@/lib/gym-meta";

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
  insertedAt?: string;
}

/**
 * A shared answer unfurls as the question on a REP card, with the start of
 * the coach's answer as the description.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}): Promise<Metadata> {
  const { conversationId } = await params;
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

    const answer = messages.find((m) => m.role === "assistant")?.content;
    return gymMeta({
      title: question,
      shareTitle: `“${question}” — The GTM Gym`,
      description: answerTeaser(answer) || "The play, with receipts: the exact minutes of FounderWell training that back it up.",
      path,
      image: `/og?q=${encodeURIComponent(question)}`,
      imageAlt: `The GTM Gym: “${question}”`,
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
