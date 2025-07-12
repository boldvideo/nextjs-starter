import { useCallback } from "react";
import { useAIAssistantContext } from "./context";
import type { Message } from "./types";

interface UseAIStreamOptions {
  /** Video ID to get AI responses for */
  videoId: string;
  /** Optional subdomain for multi-tenant setups */
  subdomain?: string;
  /** Optional endpoint override. Defaults to /api/ai_question_stream */
  endpoint?: string;
  /** Optional configuration for the AI service */
  config?: {
    /** Headers to include in the request */
    headers?: Record<string, string>;
  };
}

/**
 * Internal hook for handling streaming AI responses
 * @internal
 */
export function useAIStream({
  videoId,
  subdomain = "",
  endpoint = "/api/ask",
  config,
}: UseAIStreamOptions) {
  const { setMessages } = useAIAssistantContext();
  
  const handleAIQuestion = useCallback(
    async (
      question: string,
      conversation: Message[],
      appendChunk?: (chunk: string) => void
    ) => {
      if (!appendChunk) {
        throw new Error("Streaming requires an appendChunk function");
      }

      const controller = new AbortController();
      const { signal } = controller;

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...config?.headers,
          },
          body: JSON.stringify({
            question,
            videoId,
            subdomain,
            conversation,
          }),
          signal,
        });

        if (!response.ok) {
          const error = await response
            .json()
            .catch(() => ({ message: "Failed to initialize stream" }));
          throw new Error(error.message || "Failed to initialize stream");
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // Decode the chunk and add it to our buffer
          buffer += decoder.decode(value, { stream: true });

          // Process any complete messages in the buffer
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep the last incomplete line in the buffer

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(5));
                switch (data.type) {
                  case "chunk":
                    if (data.content) {
                      appendChunk(data.content);
                    }
                    break;
                  case "error":
                    throw new Error(data.content);
                  case "done":
                    // Handle suggested actions from the done event
                    if (data.suggested_actions && data.suggested_actions.length > 0) {
                      setMessages((prev) => {
                        const lastMessage = prev[prev.length - 1];
                        if (!lastMessage || lastMessage.role !== "assistant") return prev;
                        
                        const previousMessages = prev.slice(0, -1);
                        return [
                          ...previousMessages,
                          {
                            ...lastMessage,
                            suggested_actions: data.suggested_actions,
                          },
                        ];
                      });
                    }
                    return;
                  default:
                    console.warn("Unknown message type:", data.type);
                }
              } catch (error) {
                if (error instanceof Error) {
                  throw error;
                }
                throw new Error("Failed to parse server response");
              }
            }
          }
        }
      } catch (error) {
        controller.abort();
        throw error;
      }
    },
    [videoId, subdomain, endpoint, config, setMessages]
  );

  return handleAIQuestion;
}
