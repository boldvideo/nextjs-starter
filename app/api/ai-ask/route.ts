import { getTenantContext } from "@/lib/get-tenant-context";
import type { AIEvent, Source } from "@boldvideo/bold-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

interface AskRequestBody {
  prompt: string;
  conversationId?: string;
  collectionId?: string;
}

interface StreamState {
  accumulatedAnswer: string;
  sources: Source[];
  conversationId?: string;
}

function formatSSE(event: AIEvent, state: StreamState): string | null {
  console.debug("[ai-ask] Backend event:", event.type, event);

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
        content: event.content || state.accumulatedAnswer,
        sources: (event.sources || state.sources).map((s) => ({
          video_id: s.videoId,
          title: s.title,
          timestamp: s.timestamp,
          timestamp_end: s.timestampEnd,
          text: s.text,
          playback_id: s.playbackId,
          speaker: s.speaker,
        })),
        conversationId: state.conversationId,
      });

    case "clarification": {
      return JSON.stringify({
        type: "clarification",
        content: event.content || "",
        questions: event.questions || [],
        needs_response: true,
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

function asyncIterableToStream(
  iterable: AsyncIterable<AIEvent>,
  conversationId?: string
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const state: StreamState = {
    accumulatedAnswer: "",
    sources: [],
    conversationId,
  };

  const iterator = iterable[Symbol.asyncIterator]();

  return new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await iterator.next();

        if (done) {
          console.debug("[ai-ask] Stream iterator done, sending [DONE]");
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

  let body: AskRequestBody;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ type: "error", code: "INVALID_JSON", message: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { prompt, conversationId, collectionId } = body;

  if (!prompt || typeof prompt !== "string") {
    return new Response(
      JSON.stringify({ type: "error", code: "MISSING_PROMPT", message: "Prompt is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const stream = await context.client.ai.ask({
      prompt,
      stream: true,
      conversationId,
      collectionId,
    });

    const responseStream = asyncIterableToStream(
      stream as AsyncIterable<AIEvent>,
      conversationId
    );

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
        code: "ASK_ERROR",
        message: error instanceof Error ? error.message : "Failed to process request",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
