"use client";

import { useState, useCallback, useRef } from "react";
import {
  ClarificationResponse,
  SynthesizedResponse,
  AskCitation
} from "@/lib/ask";
import { createPlaceholderCitations, processCitations } from "@/lib/citation-helpers";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string | React.ReactNode;
  type?: "text" | "clarification" | "answer" | "error" | "loading";
  metadata?: {
    clarificationResponse?: ClarificationResponse;
    synthesizedResponse?: SynthesizedResponse;
  };
}

type StreamMessage = 
  | { type: "chunk"; content: string }
  | { type: "clarification"; content: ClarificationResponse }
  | { type: "complete"; content: SynthesizedResponse }
  | { type: "error"; content: string };

interface UseAskStreamOptions {
  onComplete?: (response: SynthesizedResponse) => void;
  onClarification?: (response: ClarificationResponse) => void;
  onError?: (error: string) => void;
}

export function useAskStream(options: UseAskStreamOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const conversationIdRef = useRef<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isWaitingForClarification, setIsWaitingForClarification] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);

  const addUserMessage = useCallback((content: string) => {
    const messageId = `user-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: messageId,
      role: "user",
      content,
      type: "text"
    }]);
    return messageId;
  }, []);

  const addAssistantMessage = useCallback((
    content: string | React.ReactNode, 
    type: ChatMessage["type"] = "text",
    metadata?: ChatMessage["metadata"]
  ) => {
    const messageId = streamingMessageIdRef.current || `assistant-${Date.now()}`;
    
    setMessages(prev => {
      const existingIndex = prev.findIndex(m => m.id === messageId);
      
      if (existingIndex >= 0) {
        const newMessages = [...prev];
        const existingMessage = newMessages[existingIndex];
        
        if (type === "text" && typeof content === "string" && typeof existingMessage.content === "string") {
          newMessages[existingIndex] = {
            ...existingMessage,
            content: existingMessage.content + content,
            metadata: metadata || existingMessage.metadata
          };
        } else {
          newMessages[existingIndex] = {
            ...existingMessage,
            content,
            type,
            metadata: metadata || existingMessage.metadata
          };
        }
        return newMessages;
      } else {
        streamingMessageIdRef.current = messageId;
        return [...prev, {
          id: messageId,
          role: "assistant",
          content,
          type,
          metadata
        }];
      }
    });
    
    return messageId;
  }, []);

  const streamQuestion = useCallback(async (
    query: string,
    useConversationId: boolean = true
  ) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    
    addUserMessage(query);
    streamingMessageIdRef.current = null;
    addAssistantMessage("", "loading");
    setIsStreaming(true);

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          message: query,
          conversationId: useConversationId ? conversationIdRef.current || undefined : undefined,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(errorText || `Request failed with status ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let hasStartedStreaming = false;
      let accumulatedText = "";
      const accumulatedCitations: AskCitation[] = [];
      const expandedQueries: string[] = [];
      let receivedCompleteEvent = false;
      let chunkCount = 0;
      let lastUpdateTime = 0;
      const UPDATE_THROTTLE_MS = 50;

      const shouldUpdateUI = () => {
        const now = Date.now();
        if (now - lastUpdateTime >= UPDATE_THROTTLE_MS) {
          lastUpdateTime = now;
          return true;
        }
        return false;
      };

      try {
        while (true) {
          if (abortControllerRef.current?.signal.aborted) {
            console.log('[useAskStream] Aborted by user');
            await reader.cancel();
            break;
          }

          const { done, value } = await reader.read();

          if (done) {
            console.log('[useAskStream] Stream done, total chunks:', chunkCount, 'receivedComplete:', receivedCompleteEvent);
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            const dataStr = line.slice(6).trim();
            if (!dataStr || dataStr === "[DONE]") continue;

            let message: StreamMessage;
            try {
              message = JSON.parse(dataStr) as StreamMessage;
            } catch {
              console.warn('[useAskStream] Failed to parse SSE data:', dataStr);
              continue;
            }

            switch (message.type) {
              case "chunk":
                chunkCount++;
                accumulatedText += message.content;
                
                if (chunkCount % 100 === 0) {
                  console.log('[useAskStream] Processed', chunkCount, 'chunks, text length:', accumulatedText.length);
                }

                if (!hasStartedStreaming || shouldUpdateUI()) {
                  const placeholderCitations = accumulatedCitations.length === 0 ?
                    createPlaceholderCitations(accumulatedText) : [];

                  addAssistantMessage(
                    accumulatedText,
                    "answer",
                    {
                      synthesizedResponse: {
                        success: true,
                        mode: "synthesized",
                        query,
                        expanded_queries: expandedQueries,
                        conversation_id: conversationIdRef.current || "",
                        answer: {
                          text: accumulatedText,
                          citations: accumulatedCitations.length > 0 ? accumulatedCitations : placeholderCitations,
                          confidence: "medium",
                          model_used: "unknown"
                        },
                        retrieval: {
                          total: accumulatedCitations.length || placeholderCitations.length,
                          chunks: []
                        },
                        processing_time_ms: 0
                      }
                    }
                  );
                  hasStartedStreaming = true;
                }
                break;

              case "clarification":
                receivedCompleteEvent = true;
                if (message.content.conversation_id) {
                  conversationIdRef.current = message.content.conversation_id;
                  setConversationId(message.content.conversation_id);
                }

                setIsWaitingForClarification(true);

                addAssistantMessage(
                  "",
                  "clarification",
                  { clarificationResponse: message.content }
                );

                options.onClarification?.(message.content);
                break;

              case "complete":
                receivedCompleteEvent = true;
                console.log('[useAskStream] Complete event received, final text length:', accumulatedText.length, 'chunk count:', chunkCount);

                if (message.content.conversation_id) {
                  conversationIdRef.current = message.content.conversation_id;
                  setConversationId(message.content.conversation_id);
                }

                setIsWaitingForClarification(false);

                const processedCitations = processCitations(
                  message.content.answer.citations || accumulatedCitations
                );

                const finalText = accumulatedText || message.content.answer?.text || "";

                const finalResponse: SynthesizedResponse = {
                  ...message.content,
                  answer: {
                    ...message.content.answer,
                    text: finalText,
                    citations: processedCitations
                  },
                  expanded_queries: message.content.expanded_queries || expandedQueries
                };

                console.log('[useAskStream] Sending final response to UI, text preview:', finalText.substring(0, 100) + '...');

                addAssistantMessage(
                  finalText,
                  "answer",
                  { synthesizedResponse: finalResponse }
                );

                options.onComplete?.(finalResponse);
                break;

              case "error":
                receivedCompleteEvent = true;
                console.error('[useAskStream] Error event from server:', message.content);
                addAssistantMessage(
                  `Error: ${message.content}`,
                  "error"
                );
                options.onError?.(message.content);
                break;

              default:
                console.warn('[useAskStream] Unknown message type:', (message as { type: string }).type);
                break;
            }
          }
        }
      } catch (loopError) {
        if (loopError instanceof Error && loopError.name === 'AbortError') {
          console.log('[useAskStream] Stream aborted');
        } else {
          console.error('[useAskStream] Error in stream loop:', loopError);
          throw loopError;
        }
      }

      reader.releaseLock();

      if (!receivedCompleteEvent && accumulatedText && !abortControllerRef.current?.signal.aborted) {
        console.warn('[useAskStream] Stream ended without complete event, finalizing partial response. Text length:', accumulatedText.length);
        const placeholderCitations = createPlaceholderCitations(accumulatedText);
        const partialResponse: SynthesizedResponse = {
          success: true,
          mode: "synthesized",
          query,
          expanded_queries: expandedQueries,
          conversation_id: conversationIdRef.current || "",
          answer: {
            text: accumulatedText,
            citations: accumulatedCitations.length > 0 ? accumulatedCitations : placeholderCitations,
            confidence: "low",
            model_used: "unknown"
          },
          retrieval: {
            total: accumulatedCitations.length || placeholderCitations.length,
            chunks: []
          },
          processing_time_ms: 0
        };

        addAssistantMessage(
          "",
          "answer",
          { synthesizedResponse: partialResponse }
        );

        options.onComplete?.(partialResponse);
      } else if (!receivedCompleteEvent && !accumulatedText && !abortControllerRef.current?.signal.aborted) {
        addAssistantMessage(
          "The response was interrupted. Please try again.",
          "error"
        );
        options.onError?.("Response interrupted");
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[useAskStream] Request aborted');
        return;
      }
      
      const errorMessage = error instanceof Error ? error.message : "Failed to stream response";
      
      addAssistantMessage(
        `Error: ${errorMessage}`,
        "error"
      );
      options.onError?.(errorMessage);
    } finally {
      setIsStreaming(false);
      streamingMessageIdRef.current = null;
      abortControllerRef.current = null;
    }
  }, [addUserMessage, addAssistantMessage, options]);

  const submitClarification = useCallback((clarification: string) => {
    streamQuestion(clarification, true);
  }, [streamQuestion]);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    conversationIdRef.current = null;
    setConversationId(null);
    setIsStreaming(false);
    setIsWaitingForClarification(false);
    streamingMessageIdRef.current = null;
  }, []);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  }, []);

  return {
    messages,
    isStreaming,
    isPending: false,
    conversationId,
    isWaitingForClarification,
    streamQuestion,
    submitClarification,
    reset,
    stop,
    addUserMessage,
    addAssistantMessage
  };
}
