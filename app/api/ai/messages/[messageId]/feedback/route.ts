import { DEFAULT_API_BASE_URL } from "@boldvideo/bold-js";
import { getTenantContext } from "@/lib/get-tenant-context";

async function feedback(request: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await params;
  let body;
  if (request.method === "POST") {
    const input = await request.json().catch(() => null);
    if (!input || (input.rating !== "up" && input.rating !== "down") ||
        (input.reasons !== undefined && (!Array.isArray(input.reasons) ||
          !input.reasons.every((reason: unknown) => typeof reason === "string" &&
            ["wrong", "not_in_video", "too_short", "off_topic", "other"].includes(reason)))) ||
        (input.note !== undefined && (typeof input.note !== "string" || input.note.length > 500))) {
      return Response.json({ error: "Invalid feedback" }, { status: 400 });
    }
    body = JSON.stringify({ rating: input.rating, reasons: input.reasons, note: input.note });
  }

  try {
    const context = await getTenantContext({ includeSettings: false });
    if (!context) return Response.json({ error: "Tenant not found" }, { status: 404 });

    const baseURL = (process.env.BACKEND_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");
    const response = await fetch(`${baseURL}/ai/messages/${encodeURIComponent(messageId)}/feedback`, {
      method: request.method,
      headers: { "Content-Type": "application/json", Authorization: context.tenantToken },
      body,
      cache: "no-store",
    });
    if (!response.ok) {
      return Response.json({ error: "Feedback failed" }, { status: response.status });
    }
    if (response.status === 204) return new Response(null, { status: 204 });
    return Response.json(await response.json());
  } catch {
    return Response.json({ error: "Feedback unavailable" }, { status: 502 });
  }
}

export { feedback as POST, feedback as DELETE };
