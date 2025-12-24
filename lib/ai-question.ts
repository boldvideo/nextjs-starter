"use server";

import { getTenantContext } from "@/lib/get-tenant-context";
import type { AIEvent, Source } from "@boldvideo/bold-js";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

interface StreamState {
  accumulatedAnswer: string;
  sources: Source[];
}

function formatSSE(event: AIEvent, state: StreamState): string | null {
  switch (event.type) {
    case "text_delta":
      state.accumulatedAnswer += event.delta;
      return JSON.stringify({ type: "chunk", content: event.delta });

    case "sources":
      state.sources = event.sources;
      return null;

    case "message_complete":
      return JSON.stringify({
        type: "complete",
        success: true,
        answer: {
          text: event.content || state.accumulatedAnswer,
          citations: (event.sources || state.sources).map((s) => ({
            video_id: s.videoId,
            title: s.title,
            timestamp: s.timestamp,
            text: s.text,
          })),
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

function asyncIterableToStream(iterable: AsyncIterable<AIEvent>): ReadableStream<Uint8Array> {
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
 * Streams AI responses from the backend using Bold JS SDK
 * Uses pull-based streaming for immediate event forwarding
 */
export async function streamAIQuestion(
  videoId: string,
  _tenant: string,
  question: string,
  _conversationId?: string,
  _actionData?: { type: string; label: string }
) {
  const context = await getTenantContext();
  if (!context) {
    throw new Error("Tenant not found");
  }

  try {
    const stream = await context.client.ai.chat({
      videoId,
      prompt: question,
    }) as AsyncIterable<AIEvent>;

    const responseStream = asyncIterableToStream(stream);

    return new Response(responseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    throw error;
  }
}
