import type { FeedbackReason } from "@boldvideo/bold-js";
import { getTenantContext } from "@/lib/get-tenant-context";

const REASONS: FeedbackReason[] = ["wrong", "not_in_video", "too_short", "off_topic", "other"];

async function feedback(request: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await params;
  let input: { rating: "up" | "down"; reasons?: FeedbackReason[]; note?: string } | undefined;
  if (request.method === "POST") {
    const body = await request.json().catch(() => null);
    if (!body || (body.rating !== "up" && body.rating !== "down") ||
        (body.reasons !== undefined && (!Array.isArray(body.reasons) ||
          !body.reasons.every((reason: unknown) => typeof reason === "string" && REASONS.includes(reason as FeedbackReason)))) ||
        (body.note !== undefined && (typeof body.note !== "string" || body.note.length > 500))) {
      return Response.json({ error: "Invalid feedback" }, { status: 400 });
    }
    input = { rating: body.rating, reasons: body.reasons, note: body.note };
  }

  try {
    const context = await getTenantContext({ includeSettings: false });
    if (!context) return Response.json({ error: "Tenant not found" }, { status: 404 });

    if (input) {
      const data = await context.client.ai.rateMessage(messageId, input);
      return Response.json({ data });
    }
    await context.client.ai.clearRating(messageId);
    return new Response(null, { status: 204 });
  } catch (error) {
    const status = typeof (error as { status?: unknown })?.status === "number" ? (error as { status: number }).status : 502;
    return Response.json({ error: status === 502 ? "Feedback unavailable" : "Feedback failed" }, { status });
  }
}

export { feedback as POST, feedback as DELETE };
