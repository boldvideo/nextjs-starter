"use server";

import { getTenantContext } from "@/lib/get-tenant-context";
import type { AIEvent, Source } from "@boldvideo/bold-js";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

/**
 * Streams AI responses from the backend using Bold JS SDK
 */
export async function streamAIQuestion(
  videoId: string,
  _tenant: string, // kept for backwards compatibility, not used
  question: string,
  _conversationId?: string, // SDK ask doesn't support conversation yet
  _actionData?: { type: string; label: string } // not supported in SDK yet
) {
  // Get tenant context for multitenancy support
  const context = await getTenantContext();
  if (!context) {
    throw new Error("Tenant not found");
  }

  try {
    // Use SDK's ai.chat() for video-scoped streaming
    const stream = await context.client.ai.chat(videoId, {
      prompt: question,
    }) as AsyncIterable<AIEvent>;

    // Transform SDK's AsyncIterable to SSE Response
    const encoder = new TextEncoder();
    let accumulatedAnswer = "";
    let sources: Source[] = [];

    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            switch (event.type) {
              case "text_delta":
                accumulatedAnswer += event.delta;
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "chunk", content: event.delta })}\n\n`
                  )
                );
                break;

              case "sources":
                sources = event.sources;
                break;

              case "message_complete":
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: "complete",
                      success: true,
                      answer: {
                        text: event.content || accumulatedAnswer,
                        citations: (event.sources || sources).map((s) => ({
                          video_id: s.video_id,
                          title: s.title,
                          timestamp: s.timestamp,
                          text: s.text,
                        })),
                      },
                    })}\n\n`
                  )
                );
                break;

              case "error":
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: "error",
                      content: event.message || "Stream error",
                    })}\n\n`
                  )
                );
                break;
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
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

    return new Response(responseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    throw error;
  }
}
