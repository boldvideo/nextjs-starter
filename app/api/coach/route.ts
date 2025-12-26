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
 * Aligned with ai-ask route for consistency
 */
function formatSSE(
  event: AIEvent,
  state: { accumulatedAnswer: string; sources: Source[]; conversationId?: string }
): string | null {
  switch (event.type) {
    case "message_start":
      state.conversationId = event.conversationId;
      return JSON.stringify({ type: "message_start", id: event.conversationId });

    case "text_delta":
      state.accumulatedAnswer += event.delta;
      return JSON.stringify({ type: "text_delta", delta: event.delta });

    case "sources":
      state.sources = event.sources;
      return JSON.stringify({
        type: "sources",
        sources: event.sources.map((s) => ({
          id: s.id,
          video_id: s.videoId,
          title: s.title,
          timestamp: s.timestamp,
          timestamp_end: s.timestampEnd,
          text: s.text,
          playback_id: s.playbackId,
          speaker: s.speaker,
        })),
      });

    case "message_complete": {
      const messageEvent = event as unknown as {
        responseType?: string;
        citations?: Source[];
        usage?: unknown;
        context?: unknown;
      };
      return JSON.stringify({
        type: "message_complete",
        responseType: messageEvent.responseType, // camelCase, pass through
        content: event.content || state.accumulatedAnswer,
        sources: (messageEvent.citations || state.sources).map((s) => ({
          id: s.id,
          video_id: s.videoId,
          title: s.title,
          timestamp: s.timestamp,
          timestamp_end: s.timestampEnd,
          text: s.text,
          playback_id: s.playbackId,
          speaker: s.speaker,
        })),
        conversationId: event.conversationId || state.conversationId,
        usage: messageEvent.usage,
        context: messageEvent.context,
      });
    }

    case "error":
      return JSON.stringify({
        type: "error",
        code: event.code,
        message: event.message,
        retryable: event.retryable,
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
