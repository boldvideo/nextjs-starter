import "server-only";

import { getTenantContext } from "@/lib/get-tenant-context";
import type { AIEvent, Segment } from "@boldvideo/bold-js";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

export type ActionData = {
  type: string;
  label: string;
};

interface StreamState {
  accumulatedAnswer: string;
  sources: Segment[];
  conversationId?: string;
}

function toCitations(sources: Segment[]) {
  return sources.map((s) => ({
    video_id: s.videoId,
    title: s.title,
    timestamp: s.timestamp,
    text: s.text,
  }));
}

function formatSSE(event: AIEvent, state: StreamState): string | null {
  switch (event.type) {
    case "message_start":
      // The backend assigns the conversation id up front. Remember it so the
      // terminal event can hand it back to the client for the next turn.
      if (event.conversationId) state.conversationId = event.conversationId;
      return null;

    case "progress":
      // The client renders these as the "working on it" affordance.
      return JSON.stringify({ type: "tool_call", name: event.stage, message: event.message });

    case "text_delta":
      state.accumulatedAnswer += event.delta;
      return JSON.stringify({ type: "chunk", content: event.delta });

    case "sources":
      state.sources = event.sources;
      return null;

    case "message_complete": {
      if (event.conversationId) state.conversationId = event.conversationId;
      return JSON.stringify({
        type: "complete",
        success: true,
        answer: {
          text: event.content || state.accumulatedAnswer,
          citations: toCitations(event.citations || state.sources),
        },
      });
    }

    case "error":
      return JSON.stringify({
        type: "error",
        content: event.message || "Stream error",
        code: event.code,
        retryable: event.retryable,
      });

    default:
      return null;
  }
}

/**
 * Terminal event. The client keys off `done` to persist the conversation id,
 * which is what makes the *next* message a follow-up rather than a new chat.
 */
function formatDone(state: StreamState): string {
  return JSON.stringify({
    type: "done",
    conversation_id: state.conversationId ?? null,
    citations: toCitations(state.sources),
  });
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
          controller.enqueue(encoder.encode(`data: ${formatDone(state)}\n\n`));
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
 *
 * NOTE: this module is deliberately NOT a "use server" module. Errors thrown
 * from a Server Action bypass the caller's try/catch and surface as a bodyless
 * 500, which the chat UI can only report as a generic failure.
 */
export async function streamAIQuestion(
  videoId: string,
  _tenant: string,
  question: string,
  conversationId?: string,
  actionData?: ActionData
) {
  const context = await getTenantContext();
  if (!context) {
    throw new Error("Tenant not found");
  }

  // Suggested-action chips carry their own prompt text in `value`; the label is
  // what the user saw, so send it along for context.
  const prompt = actionData?.label
    ? `${question}\n\n(user picked: ${actionData.label})`
    : question;

  const stream = (await context.client.ai.chat({
    ...(videoId ? { videoId } : {}),
    prompt,
    ...(conversationId ? { conversationId } : {}),
  })) as AsyncIterable<AIEvent>;

  const responseStream = asyncIterableToStream(stream);

  return new Response(responseStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
