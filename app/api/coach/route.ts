import { getTenantContext } from "@/lib/get-tenant-context";
import type { AIEvent, Segment } from "@boldvideo/bold-js";

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
  state: { accumulatedAnswer: string; sources: Segment[]; conversationId?: string }
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
          cited: s.cited,
        })),
      });

    case "message_complete": {
      // Use sources from event (SDK provides as citations), fall back to accumulated state
      const completeSources = event.citations || state.sources;
      return JSON.stringify({
        type: "message_complete",
        responseType: event.responseType,
        content: event.content || state.accumulatedAnswer,
        sources: completeSources.map((s: Segment) => ({
          id: s.id,
          video_id: s.videoId,
          title: s.title,
          timestamp: s.timestamp,
          timestamp_end: s.timestampEnd,
          text: s.text,
          playback_id: s.playbackId,
          speaker: s.speaker,
          cited: s.cited,
        })),
        conversationId: event.conversationId || state.conversationId,
        usage: event.usage,
        context: event.context,
      });
    }

    case "error":
      return JSON.stringify({
        type: "error",
        code: event.code,
        message: event.message,
        retryable: event.retryable,
      });

    case "progress":
      return JSON.stringify({
        type: "progress",
        stage: event.stage,
        message: event.message,
      });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    case "image_analysis" as any:
      return JSON.stringify({
        type: "image_analysis",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        message: (event as any).message,
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
    sources: [] as Segment[],
    conversationId,
  };

  return new ReadableStream({
    start(controller) {
      (async () => {
        for await (const event of iterable) {
          const sseData = formatSSE(event, state);
          if (sseData) {
            controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      })().catch((error) => {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              content: error instanceof Error ? error.message : "Stream error",
            })}\n\n`
          )
        );
        controller.close();
      });
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

  const contentType = request.headers.get("content-type") ?? "";
  let message: string | undefined;
  let conversationId: string | undefined;
  let images: File[] = [];

  if (contentType.startsWith("multipart/form-data")) {
    try {
      const form = await request.formData();
      const messageValue = form.get("message");
      message = typeof messageValue === "string" ? messageValue : undefined;
      const cid = form.get("conversationId");
      conversationId = typeof cid === "string" ? cid : undefined;
      images = form.getAll("image").filter((v): v is File => v instanceof File);
    } catch {
      return new Response(
        JSON.stringify({ type: "error", content: "Invalid multipart body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  } else {
    let body: CoachRequestBody;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ type: "error", content: "Invalid JSON body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    message = body.message;
    conversationId = body.conversationId;
  }

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
      // BOLD-1449: pass images per the published SDK shape (cast until SDK types catch up)
      ...(images.length > 0 ? { images } : {}),
    } as Parameters<typeof context.client.ai.coach>[0]);

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
