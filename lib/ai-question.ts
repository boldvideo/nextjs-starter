"use server";

import { getTenantContext } from "@/lib/get-tenant-context";
import type { Citation } from "@boldvideo/bold-js";

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
    // Use SDK's ai.ask() for streaming
    const stream = await context.client.ai.ask(videoId, {
      message: question,
    });

    // Transform SDK's AsyncIterable to SSE Response
    const encoder = new TextEncoder();
    let accumulatedAnswer = "";
    let citations: Citation[] = [];

    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            switch (event.type) {
              case "token":
                accumulatedAnswer += event.content;
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "chunk", content: event.content })}\n\n`
                  )
                );
                break;

              case "answer":
                if (event.content && !accumulatedAnswer) {
                  accumulatedAnswer = event.content;
                }
                if (event.citations) {
                  citations = event.citations;
                }
                break;

              case "complete":
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: "complete",
                      success: true,
                      answer: {
                        text: accumulatedAnswer,
                        citations: citations.map((c) => ({
                          video_id: c.video_id,
                          title: c.title,
                          timestamp: Math.floor(c.timestamp_ms / 1000),
                          text: c.text,
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
