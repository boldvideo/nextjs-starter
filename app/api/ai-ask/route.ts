import { getTenantContext } from "@/lib/get-tenant-context";
import type { AIEvent, Segment } from "@boldvideo/bold-js";

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
  sources: Segment[];
  conversationId?: string;
}

function formatSSE(event: AIEvent, state: StreamState): string | null {
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
              code: "STREAM_ERROR",
              message: error instanceof Error ? error.message : "Stream error",
              retryable: false,
            })}\n\n`
          )
        );
        controller.close();
      });
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

  const contentType = request.headers.get("content-type") ?? "";
  let prompt: string | undefined;
  let conversationId: string | undefined;
  let collectionId: string | undefined;
  let images: File[] = [];

  if (contentType.startsWith("multipart/form-data")) {
    try {
      const form = await request.formData();
      const promptValue = form.get("prompt");
      prompt = typeof promptValue === "string" ? promptValue : undefined;
      const cid = form.get("conversationId");
      conversationId = typeof cid === "string" ? cid : undefined;
      const colId = form.get("collectionId");
      collectionId = typeof colId === "string" ? colId : undefined;
      images = form.getAll("image").filter((v): v is File => v instanceof File);
    } catch {
      return new Response(
        JSON.stringify({ type: "error", code: "INVALID_MULTIPART", message: "Invalid multipart body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  } else {
    let body: AskRequestBody;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ type: "error", code: "INVALID_JSON", message: "Invalid JSON body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    prompt = body.prompt;
    conversationId = body.conversationId;
    collectionId = body.collectionId;
  }

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
      // BOLD-1449: pass images per the published SDK shape (cast until SDK types catch up)
      ...(images.length > 0 ? { images } : {}),
    } as Parameters<typeof context.client.ai.ask>[0]);

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
