import { useCallback } from "react";
import { useAIAssistantContext } from "./context";
import type { AnswerInteraction } from "@/lib/source-engagement";

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
  const { setMessages, setConversationId } = useAIAssistantContext();
  
  const handleAIQuestion = useCallback(
    async (
      question: string,
      conversationId: string | null,
      appendChunk?: (chunk: string) => void,
      actionData?: { label: string; value: string },
      interaction?: AnswerInteraction
    ) => {
      if (!appendChunk) {
        throw new Error("Streaming requires an appendChunk function");
      }

      const controller = new AbortController();
      const { signal } = controller;

      // Set timeout for web search scenarios (3 minutes)
      const timeoutId = setTimeout(() => controller.abort(), 180000);

      try {
        const requestBody = actionData
          ? {
              id: videoId,
              type: "action",
              value: actionData.value,
              label: actionData.label,
              ...(conversationId && { conversation_id: conversationId }),
            }
          : {
              question,
              videoId,
              subdomain,
              ...(conversationId && { conversationId }),
            };

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...config?.headers,
          },
          body: JSON.stringify(requestBody),
          signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = await response.json().catch(() => null);
          throw new Error(
            error?.message ||
              error?.content ||
              `Chat request failed (${response.status} ${response.statusText})`
          );
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
                  case "tool_call":
                    // Add tool call information to the current message
                    setMessages((prev) => {
                      const lastMessage = prev[prev.length - 1];
                      if (!lastMessage || lastMessage.role !== "assistant") return prev;

                      const previousMessages = prev.slice(0, -1);
                      return [
                        ...previousMessages,
                        {
                          ...lastMessage,
                          tool_call: { name: data.name },
                        },
                      ];
                    });
                    break;
                  case "suggested_action":
                    setMessages((prev) => {
                      const lastMessage = prev[prev.length - 1];
                      if (!lastMessage || lastMessage.role !== "assistant") return prev;

                      const previousMessages = prev.slice(0, -1);
                      return [
                        ...previousMessages,
                        {
                          ...lastMessage,
                          suggested_actions: data.actions,
                          suggested_actions_prompt: data.prompt,
                        },
                      ];
                    });
                    break;
                  case "complete":
                    interaction?.complete(data.interactionId);
                    setMessages(prev => prev.map(message => message.interaction === interaction
                      ? { ...message, interactionId: data.interactionId } : message));
                    // Final answer payload; `done` carries the conversation id.
                    break;
                  case "error":
                    throw new Error(data.content || data.message);
                  case "done":
                    // Capture conversation_id from backend response
                    if (data.conversation_id) {
                      setConversationId(data.conversation_id);
                    }

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
        clearTimeout(timeoutId);
        controller.abort();
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        throw error;
      } finally {
        interaction?.complete(null);
      }
    },
    [videoId, subdomain, endpoint, config, setMessages, setConversationId]
  );

  return handleAIQuestion;
}
