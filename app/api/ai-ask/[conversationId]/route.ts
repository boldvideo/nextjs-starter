import { getTenantContext } from "@/lib/get-tenant-context";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;

  const context = await getTenantContext();
  if (!context) {
    return Response.json(
      { error: "Tenant not found" },
      { status: 404 }
    );
  }

  try {
    const conversation = await context.client.ai.getConversation(conversationId);
    return Response.json(conversation);
  } catch (error) {
    console.error("[AI Ask] Failed to fetch conversation:", error);
    
    if (error instanceof Error && error.message.includes("404")) {
      return Response.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }
    
    return Response.json(
      { error: "Failed to fetch conversation" },
      { status: 500 }
    );
  }
}
