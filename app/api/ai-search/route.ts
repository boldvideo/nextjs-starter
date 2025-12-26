import { getTenantContext } from "@/lib/get-tenant-context";
import type { AIEvent, Segment } from "@boldvideo/bold-js";

export const runtime = "nodejs";
export const maxDuration = 60;

interface AIContextMessage {
  role: "user" | "assistant";
  content: string;
}

interface AISearchRequestBody {
  prompt: string;
  limit?: number;
  context?: AIContextMessage[];
}

interface StreamState {
  accumulatedAnswer: string;
  sources: Segment[];
  messageId?: string;
  context?: AIContextMessage[];
}

function formatSSE(event: AIEvent, state: StreamState): string | null {
  switch (event.type) {
    case "message_start":
      state.messageId = event.conversationId;
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

    case "message_complete":
      return JSON.stringify({
        type: "message_complete",
        responseType: event.responseType,
        content: event.content || state.accumulatedAnswer,
        sources: (event.citations || state.sources).map((s) => ({
          id: s.id,
          video_id: s.videoId,
          title: s.title,
          timestamp: s.timestamp,
          timestamp_end: s.timestampEnd,
          text: s.text,
          playback_id: s.playbackId,
          speaker: s.speaker,
        })),
        context: state.context,
        usage: event.usage,
      });

    case "error":
      return JSON.stringify({
        type: "error",
        code: event.code,
        message: event.message,
        retryable: event.retryable,
      });

    default:
      // Ignore unknown event types. The backend may emit legacy 'token' events
      // for backwards compatibility, but we only use 'text_delta' as of bold-js 1.0.1
      return null;
  }
}

function asyncIterableToStream(
  iterable: AsyncIterable<AIEvent>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const state: StreamState = {
    accumulatedAnswer: "",
    sources: [],
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
              code: "STREAM_ERROR",
              message: error instanceof Error ? error.message : "Stream error",
              retryable: false,
            })}\n\n`
          )
        );
        controller.close();
      }
    },
  });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context) {
    return new Response(
      JSON.stringify({ type: "error", code: "TENANT_NOT_FOUND", message: "Tenant not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: AISearchRequestBody;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ type: "error", code: "INVALID_JSON", message: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { prompt, limit = 5, context: conversationContext } = body;

  if (!prompt || typeof prompt !== "string") {
    return new Response(
      JSON.stringify({ type: "error", code: "MISSING_PROMPT", message: "Prompt is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const stream = await context.client.ai.search({
      prompt,
      limit,
      context: conversationContext,
    });

    const responseStream = asyncIterableToStream(stream as AsyncIterable<AIEvent>);

    return new Response(responseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        type: "error",
        code: "SEARCH_ERROR",
        message: error instanceof Error ? error.message : "Failed to process search",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
