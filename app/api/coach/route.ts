import { AskCitation } from "@/lib/ask";
import { processCitations } from "@/lib/citation-helpers";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for long responses

interface CoachRequestBody {
  message: string;
  conversationId?: string;
}

/**
 * API Route for coach streaming - uses proper SSE instead of Server Actions
 */
export async function POST(request: Request) {
  const apiHost = process.env.BACKEND_URL || "https://api.boldvideo.io";
  const apiKey = process.env.BOLD_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ type: "error", content: "Missing API configuration" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
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

  // Construct backend URL
  const baseUrl = apiHost.startsWith("http") ? apiHost : `https://${apiHost}`;
  const apiPath = baseUrl.includes("/api/v1") ? "" : "/api/v1";
  const endpoint = conversationId
    ? `${baseUrl}${apiPath}/ask/${conversationId}`
    : `${baseUrl}${apiPath}/ask`;


  try {
    const backendResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ message }),
      cache: "no-store",
    });

    if (!backendResponse.ok) {
      return new Response(
        JSON.stringify({
          type: "error",
          content: conversationId
            ? `Failed to continue conversation (${backendResponse.status})`
            : `Request failed: ${backendResponse.status}`,
        }),
        { status: backendResponse.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const contentType = backendResponse.headers.get("content-type");

    // If not streaming, handle as regular JSON response
    if (!contentType?.includes("text/event-stream")) {
      const data = await backendResponse.json();

      // Return as SSE format for consistency
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          if (data.mode === "clarification" && data.needs_clarification) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "clarification", ...data })}\n\n`)
            );
          } else if (data.mode === "synthesized") {
            // Send chunks for text
            const text = data.answer?.text || "";
            const chunkSize = 50;
            for (let i = 0; i < text.length; i += chunkSize) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "chunk", content: text.slice(i, i + chunkSize) })}\n\n`
                )
              );
            }
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "complete", ...data })}\n\n`)
            );
          } else if (data.error) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "error", content: data.error })}\n\n`)
            );
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Handle streaming response - transform backend SSE to our format
    const reader = backendResponse.body?.getReader();
    if (!reader) {
      return new Response(
        JSON.stringify({ type: "error", content: "No response body" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = "";
    let accumulatedAnswer = "";
    let citations: AskCitation[] = [];
    let currentConversationId = conversationId;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              // Flush remaining buffer
              buffer += decoder.decode();
              if (buffer.trim()) {
                processLine(buffer, controller);
              }
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const shouldStop = processLine(line, controller);
              if (shouldStop) {
                controller.close();
                return;
              }
            }
          }

          // If we got here without a complete event, send what we have
          if (accumulatedAnswer) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "complete",
                  success: true,
                  mode: "synthesized",
                  conversation_id: currentConversationId || "",
                  answer: {
                    text: accumulatedAnswer,
                    citations,
                    confidence: "medium",
                    model_used: "unknown",
                  },
                })}\n\n`
              )
            );
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

    // Helper to process SSE lines from backend
    const processLine = (
      line: string,
      controller: ReadableStreamDefaultController
    ): boolean => {
      if (!line.startsWith("data: ")) return false;

      const dataStr = line.slice(6).trim();
      if (!dataStr || dataStr === "[DONE]") return false;

      try {
        const data = JSON.parse(dataStr);

        switch (data.type) {
          case "conversation_created":
            if (data.id) {
              currentConversationId = data.id;
            }
            break;

          case "token":
            if (data.content) {
              accumulatedAnswer += data.content;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "chunk", content: data.content })}\n\n`
                )
              );
            }
            break;

          case "answer":
            if (data.content && !accumulatedAnswer) {
              accumulatedAnswer = data.content;
            }
            if (data.citations) {
              citations = processCitations(data.citations);
            }
            break;

          case "clarification":
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "clarification",
                  success: true,
                  mode: "clarification",
                  needs_clarification: true,
                  clarifying_questions: data.questions || [],
                  missing_dimensions: data.dimensions || [],
                  conversation_id: data.conversation_id || currentConversationId || "",
                })}\n\n`
              )
            );
            return true; // Stop processing

          case "complete":
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "complete",
                  success: true,
                  mode: "synthesized",
                  conversation_id: currentConversationId || "",
                  answer: {
                    text: accumulatedAnswer,
                    citations,
                    confidence: "medium",
                    model_used: "unknown",
                  },
                })}\n\n`
              )
            );
            return true; // Stop processing

          case "error":
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "error",
                  content: data.message || "Stream error",
                })}\n\n`
              )
            );
            return true; // Stop processing
        }
      } catch {
        // Non-JSON SSE lines (e.g., keep-alive, comments) are expected and safe to ignore
      }
      return false;
    };

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
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
