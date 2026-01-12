import { AskPageContent } from "@/components/ask/ask-page-content";

export default async function AskConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;

  return <AskPageContent conversationId={conversationId} />;
}
