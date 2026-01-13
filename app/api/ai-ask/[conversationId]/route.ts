import { getTenantContext } from "@/lib/get-tenant-context";
import { DEFAULT_API_BASE_URL } from "@boldvideo/bold-js";

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

  const baseURL = process.env.BACKEND_URL || DEFAULT_API_BASE_URL;

  try {
    const response = await fetch(`${baseURL}/ai/chat/${conversationId}`, {
      headers: {
        Authorization: `Bearer ${context.tenantToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return Response.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error("[AI Ask] Failed to fetch conversation:", error);
    return Response.json(
      { error: "Failed to fetch conversation" },
      { status: 500 }
    );
  }
}
