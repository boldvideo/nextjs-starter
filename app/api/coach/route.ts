import { getTenantContext } from "@/lib/get-tenant-context";
import type { AIEvent, Source } from "@boldvideo/bold-js";

export const runtime = "nodejs";
export const maxDuration = 300;

interface CoachRequestBody {
  message: string;
  conversationId?: string;
}

/**
 * Convert SDK events to SSE format
 */
function formatSSE(
  event: AIEvent,
  state: { accumulatedAnswer: string; sources: Source[]; conversationId?: string }
): string | null {
  switch (event.type) {
    case "message_start":
      state.conversationId = event.id;
      return null;

    case "text_delta":
      state.accumulatedAnswer += event.delta;
      return JSON.stringify({ type: "chunk", content: event.delta });

    case "sources":
      state.sources = event.sources;
      return null;

    case "clarification":
      return JSON.stringify({
        type: "clarification",
        success: true,
        mode: "clarification",
        needs_clarification: true,
        clarifying_questions: event.questions || [],
        conversation_id: state.conversationId || "",
      });

    case "message_complete":
      return JSON.stringify({
        type: "complete",
        success: true,
        mode: "synthesized",
        conversation_id: state.conversationId || "",
        answer: {
          text: event.content || state.accumulatedAnswer,
          citations: (event.sources || state.sources).map((s) => ({
            video_id: s.video_id,
            video_title: s.title,
            start_ms: s.timestamp * 1000, // Convert seconds to milliseconds
            text: s.text,
            playback_id: s.playback_id,
          })),
          confidence: "medium",
        },
      });

    case "error":
      return JSON.stringify({
        type: "error",
        content: event.message || "Stream error",
      });

    default:
      return null;
  }
}

/**
 * Create a ReadableStream from an AsyncIterable that streams immediately
 */
function asyncIterableToStream(
  iterable: AsyncIterable<AIEvent>,
  conversationId?: string
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const state = {
    accumulatedAnswer: "",
    sources: [] as Source[],
    conversationId,
  };

  const iterator = iterable[Symbol.asyncIterator]();

  return new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await iterator.next();

        if (done) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        const sseData = formatSSE(value, state);
        if (sseData) {
          controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
        }
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              content: error instanceof Error ? error.message : "Stream error",
            })}\n\n`
          )
        );
        controller.close();
      }
    },
  });
}

/**
 * API Route for coach streaming - uses Bold JS SDK
 * Uses pull-based streaming for immediate event forwarding
 */
export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context) {
    return new Response(
      JSON.stringify({ type: "error", content: "Tenant not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: CoachRequestBody;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ type: "error", content: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { message, conversationId } = body;

  if (!message || typeof message !== "string") {
    return new Response(
      JSON.stringify({ type: "error", content: "Message is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const stream = await context.client.ai.coach({
      prompt: message,
      conversationId,
    });

    // Convert AsyncIterable to ReadableStream with pull-based streaming
    const responseStream = asyncIterableToStream(stream as AsyncIterable<AIEvent>, conversationId);

    return new Response(responseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        type: "error",
        content: error instanceof Error ? error.message : "Failed to process request",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
