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

interface ChunkMessage {
  type: "chunk";
  content: string;
}

interface ClarificationMessage {
  type: "clarification";
  success: boolean;
  mode: string;
  needs_clarification: boolean;
  clarifying_questions: string[];
  missing_dimensions: string[];
  conversation_id: string;
}

interface CompleteMessage {
  type: "complete";
  success: boolean;
  mode: string;
  conversation_id: string;
  answer: {
    text: string;
    citations: AskCitation[];
    confidence: string;
    model_used: string;
  };
  expanded_queries?: string[];
}

interface ErrorMessage {
  type: "error";
  content: string;
}

type StreamMessage = ChunkMessage | ClarificationMessage | CompleteMessage | ErrorMessage;

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
            await reader.cancel();
            break;
          }

          const { done, value } = await reader.read();

          if (done) {
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
              continue;
            }

            switch (message.type) {
              case "chunk":
                accumulatedText += message.content;
                
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

              case "clarification": {
                receivedCompleteEvent = true;
                const clarificationMsg = message as ClarificationMessage;
                
                if (clarificationMsg.conversation_id) {
                  conversationIdRef.current = clarificationMsg.conversation_id;
                  setConversationId(clarificationMsg.conversation_id);
                }

                setIsWaitingForClarification(true);

                const clarificationResponse: ClarificationResponse = {
                  success: true,
                  mode: "clarification",
                  needs_clarification: true,
                  clarifying_questions: clarificationMsg.clarifying_questions,
                  missing_dimensions: clarificationMsg.missing_dimensions,
                  original_query: query,
                  conversation_id: clarificationMsg.conversation_id
                };

                addAssistantMessage(
                  "",
                  "clarification",
                  { clarificationResponse }
                );

                options.onClarification?.(clarificationResponse);
                break;
              }

              case "complete": {
                receivedCompleteEvent = true;
                const completeMsg = message as CompleteMessage;

                if (completeMsg.conversation_id) {
                  conversationIdRef.current = completeMsg.conversation_id;
                  setConversationId(completeMsg.conversation_id);
                }

                setIsWaitingForClarification(false);

                const processedCitations = processCitations(
                  completeMsg.answer.citations || accumulatedCitations
                );

                const finalText = accumulatedText || completeMsg.answer?.text || "";

                const finalResponse: SynthesizedResponse = {
                  success: true,
                  mode: "synthesized",
                  query,
                  conversation_id: completeMsg.conversation_id,
                  expanded_queries: completeMsg.expanded_queries || expandedQueries,
                  answer: {
                    text: finalText,
                    citations: processedCitations,
                    confidence: completeMsg.answer.confidence as "high" | "medium" | "low",
                    model_used: completeMsg.answer.model_used
                  },
                  retrieval: {
                    total: processedCitations.length,
                    chunks: []
                  },
                  processing_time_ms: 0
                };

                addAssistantMessage(
                  finalText,
                  "answer",
                  { synthesizedResponse: finalResponse }
                );

                options.onComplete?.(finalResponse);
                break;
              }

              case "error": {
                receivedCompleteEvent = true;
                const errorMsg = message as ErrorMessage;
                addAssistantMessage(
                  `Error: ${errorMsg.content}`,
                  "error"
                );
                options.onError?.(errorMsg.content);
                break;
              }

              default:
                break;
            }
          }
        }
      } catch (loopError) {
        if (loopError instanceof Error && loopError.name === 'AbortError') {
          // Stream was intentionally aborted
        } else {
          throw loopError;
        }
      }

      reader.releaseLock();

      if (!receivedCompleteEvent && accumulatedText && !abortControllerRef.current?.signal.aborted) {
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
          accumulatedText,
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
