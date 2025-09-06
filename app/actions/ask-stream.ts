"use server";

import { 
  AskResponse,
  ClarificationResponse,
  SynthesizedResponse,
  ErrorResponse 
} from "@/lib/ask";

export type StreamMessage = 
  | { type: "chunk"; content: string }
  | { type: "clarification"; content: ClarificationResponse }
  | { type: "complete"; content: SynthesizedResponse }
  | { type: "error"; content: string };

interface StreamAskParams {
  query: string;
  conversationId?: string;
  mode?: string;
  synthesize?: boolean;
}

/**
 * Server action for streaming AI responses with clarification support
 * Returns a ReadableStream for client-side consumption
 */
export async function streamAskAction({
  query,
  conversationId,
  mode = "enhanced",
  synthesize = true
}: StreamAskParams): Promise<ReadableStream<StreamMessage>> {
  const apiHost = process.env.BACKEND_URL || "https://api.boldvideo.io";
  const apiKey = process.env.NEXT_PUBLIC_BOLD_API_KEY;

  return new ReadableStream<StreamMessage>({
    async start(controller) {
      if (!apiKey) {
        controller.enqueue({ type: "error", content: "Missing API configuration" });
        controller.close();
        return;
      }

      try {
        // Construct URL based on whether we have a conversation ID
        const baseUrl = apiHost.startsWith("http") ? apiHost : `https://${apiHost}`;
        const apiPath = baseUrl.includes('/api/v1') ? '' : '/api/v1';
        
        // If we have a conversationId, append it to the URL path (continue conversation)
        // Otherwise, use the base /ask endpoint (start new conversation)
        const endpoint = conversationId 
          ? `${baseUrl}${apiPath}/ask/${conversationId}`
          : `${baseUrl}${apiPath}/ask`;

        console.log('[ask-stream] Request details:', {
          endpoint,
          conversationId,
          isNewConversation: !conversationId,
          query
        });

        // Build request body using the new API format
        const requestBody = {
          message: query
        };

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: apiKey,
            Accept: "text/event-stream",
          },
          body: JSON.stringify(requestBody),
          cache: "no-store",
        });

        if (!response.ok) {
          const errorText = await response.text();
          controller.enqueue({ type: "error", content: `Request failed: ${response.status}` });
          controller.close();
          return;
        }

        // If not streaming, handle as regular JSON response
        const contentType = response.headers.get("content-type");
        if (!contentType?.includes("text/event-stream")) {
          const data = await response.json();
          
          // Check if it's a clarification response
          if (data.mode === "clarification" && data.needs_clarification) {
            controller.enqueue({ type: "clarification", content: data as ClarificationResponse });
          } else if (data.mode === "synthesized") {
            // For non-streaming responses, emit chunks progressively for better UX
            const text = data.answer.text;
            const chunkSize = 50; // Characters per chunk
            for (let i = 0; i < text.length; i += chunkSize) {
              controller.enqueue({ type: "chunk", content: text.slice(i, i + chunkSize) });
              // Small delay to simulate streaming
              await new Promise(resolve => setTimeout(resolve, 20));
            }
            controller.enqueue({ type: "complete", content: data as SynthesizedResponse });
          } else if (data.error) {
            controller.enqueue({ type: "error", content: data.error });
          }
          controller.close();
          return;
        }

        // Handle streaming response
        const reader = response.body?.getReader();
        if (!reader) {
          controller.enqueue({ type: "error", content: "No response body" });
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let accumulatedAnswer = "";
        let citations: any[] = [];
        let expandedQueries: string[] = [];
        let currentConversationId = conversationId;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(5).trim();
              
              // Skip empty data or [DONE] marker
              if (!dataStr || dataStr === "[DONE]") continue;
              
              try {
                const data = JSON.parse(dataStr);
                
                switch (data.type) {
                  case "conversation_created":
                    // Store conversation ID from initial message
                    if (data.id) {
                      currentConversationId = data.id;
                      console.log('[ask-stream] Conversation created with ID:', data.id);
                    }
                    break;
                    
                  case "token":
                    // Stream individual tokens to the UI
                    if (data.content) {
                      accumulatedAnswer += data.content;
                      controller.enqueue({ type: "chunk", content: data.content });
                    }
                    break;
                    
                  case "answer":
                    // Complete answer with citations and usage stats
                    if (data.content && !accumulatedAnswer) {
                      // Use as backup if we didn't accumulate tokens
                      accumulatedAnswer = data.content;
                    }
                    if (data.citations) {
                      // Process citations - API v2.0 format
                      citations = data.citations.map((c: any, idx: number) => ({
                        ...c,
                        // Ensure we have all required v2.0 fields
                        id: c.id || `${c.video_id}_${c.start_ms || 0}`,
                        relevance_score: c.relevance_score ?? 0.5,
                        relevance_rank: c.relevance_rank ?? (idx + 1),
                        timestamp_start: c.timestamp_start || "00:00",
                        timestamp_end: c.timestamp_end || "",
                        video_title: c.video_title || "Untitled",
                        speaker: c.speaker || "Speaker",
                        transcript_excerpt: c.transcript_excerpt || ""
                      }));
                      console.log('[ask-stream] Processed citations:', citations);
                    }
                    // Don't close here, wait for "complete" event
                    break;
                    
                  case "clarification":
                    // Handle clarification request
                    controller.enqueue({ 
                      type: "clarification", 
                      content: {
                        success: true,
                        mode: "clarification",
                        needs_clarification: true,
                        clarifying_questions: data.questions || [],
                        missing_dimensions: data.dimensions || [],
                        original_query: query,
                        conversation_id: data.conversation_id || currentConversationId || ""
                      }
                    });
                    controller.close();
                    return; // Stop streaming when clarification is needed
                    
                  case "complete":
                    // Stream has ended, send the complete response
                    controller.enqueue({
                      type: "complete",
                      content: {
                        success: true,
                        mode: "synthesized",
                        query,
                        expanded_queries: expandedQueries,
                        conversation_id: currentConversationId || "",
                        answer: {
                          text: accumulatedAnswer,
                          citations: citations,
                          confidence: "medium",
                          model_used: "unknown"
                        },
                        retrieval: {
                          total: citations.length,
                          chunks: []
                        },
                        processing_time_ms: 0
                      }
                    });
                    controller.close();
                    return;
                    
                  case "error":
                    controller.enqueue({ type: "error", content: data.message || "Stream error" });
                    controller.close();
                    return;
                    
                  default:
                    console.log("Unknown stream event type:", data.type);
                }
              } catch (e) {
                console.error("Failed to parse SSE data:", dataStr, e);
              }
            }
          }
        }

        // If we got here without a complete event, send what we have
        if (accumulatedAnswer) {
          controller.enqueue({
            type: "complete",
            content: {
              success: true,
              mode: "synthesized",
              query,
              expanded_queries: expandedQueries,
              conversation_id: currentConversationId || "",
              answer: {
                text: accumulatedAnswer,
                citations: citations,
                confidence: "medium",
                model_used: "unknown"
              },
              retrieval: {
                total: citations.length,
                chunks: []
              },
              processing_time_ms: 0
            }
          });
        }
        controller.close();
      } catch (error) {
        console.error("Stream error:", error);
        controller.enqueue({ 
          type: "error", 
          content: error instanceof Error ? error.message : "Failed to stream response" 
        });
        controller.close();
      }
    }
  });
}

/**
 * Fallback non-streaming version for environments that don't support streaming
 */
export async function askAction({
  query,
  conversationId,
  mode = "enhanced",
  synthesize = true
}: StreamAskParams): Promise<AskResponse> {
  const apiHost = process.env.BACKEND_URL || "https://api.boldvideo.io";
  const apiKey = process.env.NEXT_PUBLIC_BOLD_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: "Missing API configuration"
    };
  }

  try {
    const baseUrl = apiHost.startsWith("http") ? apiHost : `https://${apiHost}`;
    const apiPath = baseUrl.includes('/api/v1') ? '' : '/api/v1';
    
    // Use conversation ID in path if available, otherwise use base endpoint
    const endpoint = conversationId 
      ? `${baseUrl}${apiPath}/ask/${conversationId}`
      : `${baseUrl}${apiPath}/ask`;

    // Build request body using the new API format
    const requestBody = {
      message: query
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Request failed with status ${response.status}`
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Ask action error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to process question"
    };
  }
}