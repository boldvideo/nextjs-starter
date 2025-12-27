"use client";

import { useState, useCallback, useRef } from "react";
import {
  ClarificationResponse,
  SynthesizedResponse,
  AskCitation
} from "@/lib/ask";
import { createPlaceholderCitations } from "@/lib/citation-helpers";

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

interface MessageStartMessage {
  type: "message_start";
  id: string;
}

interface TextDeltaMessage {
  type: "text_delta";
  delta: string;
}

interface SourcesMessage {
  type: "sources";
  sources: Array<{
    id?: string;
    video_id: string;
    title: string;
    timestamp: number;
    timestamp_end?: number;
    text: string;
    playback_id?: string;
    speaker?: string;
    cited?: boolean;
  }>;
}

interface MessageCompleteMessage {
  type: "message_complete";
  responseType: "answer" | "clarification"; // camelCase from server
  content: string;
  sources?: Array<{
    id?: string;
    video_id: string;
    title: string;
    timestamp: number;
    timestamp_end?: number;
    text: string;
    playback_id?: string;
    speaker?: string;
    cited?: boolean;
  }>;
  conversationId?: string;
  usage?: unknown;
  context?: unknown;
}

interface ErrorMessage {
  type: "error";
  code?: string;
  message: string;
  retryable?: boolean;
}

type StreamMessage =
  | MessageStartMessage
  | TextDeltaMessage
  | SourcesMessage
  | MessageCompleteMessage
  | ErrorMessage;

interface UseAskStreamOptions {
  onComplete?: (response: SynthesizedResponse) => void;
  onClarification?: (response: ClarificationResponse) => void;
  onError?: (error: string) => void;
}

function formatTimestamp(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function convertToCitation(
  source: SourcesMessage["sources"][0],
  index: number
): AskCitation {
  const startMs = source.timestamp * 1000;
  const endMs = (source.timestamp_end || source.timestamp) * 1000;
  return {
    id: source.id || `${source.video_id}_${source.timestamp}_${index}`,
    relevanceScore: 1 - index * 0.1,
    relevanceRank: index + 1,
    videoId: source.video_id,
    playbackId: source.playback_id || "",
    videoTitle: source.title,
    timestampStart: formatTimestamp(startMs),
    timestampEnd: formatTimestamp(endMs),
    startMs,
    endMs,
    speaker: source.speaker || "Speaker",
    text: source.text,
    transcriptExcerpt: source.text,
    cited: source.cited ?? true,
  };
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
              case "message_start":
                if (message.id) {
                  conversationIdRef.current = message.id;
                  setConversationId(message.id);
                }
                break;

              case "text_delta":
                accumulatedText += message.delta;

                if (!hasStartedStreaming || shouldUpdateUI()) {
                  const placeholderCitations =
                    accumulatedCitations.length === 0
                      ? createPlaceholderCitations(accumulatedText)
                      : [];

                  addAssistantMessage(accumulatedText, "answer", {
                    synthesizedResponse: {
                      success: true,
                      mode: "synthesized",
                      query,
                      expandedQueries: expandedQueries,
                      conversationId: conversationIdRef.current || "",
                      answer: {
                        text: accumulatedText,
                        citations:
                          accumulatedCitations.length > 0
                            ? accumulatedCitations
                            : placeholderCitations,
                        confidence: "medium",
                        modelUsed: "unknown",
                      },
                      retrieval: {
                        total:
                          accumulatedCitations.length || placeholderCitations.length,
                        chunks: [],
                      },
                      processingTimeMs: 0,
                    },
                  });
                  hasStartedStreaming = true;
                }
                break;

              case "sources":
                // Convert sources to citations and accumulate
                accumulatedCitations.length = 0;
                accumulatedCitations.push(
                  ...message.sources.map((s, i) => convertToCitation(s, i))
                );
                break;

              case "message_complete": {
                receivedCompleteEvent = true;
                if (message.conversationId) {
                  conversationIdRef.current = message.conversationId;
                  setConversationId(message.conversationId);
                }

                // Check responseType (camelCase from server)
                if (message.responseType === "clarification") {
                  // Clarification: content contains the clarifying question
                  setIsWaitingForClarification(true);

                  const clarificationResponse: ClarificationResponse = {
                    success: true,
                    mode: "clarification",
                    needsClarification: true,
                    clarifyingQuestions: [message.content], // The content IS the question
                    missingDimensions: [],
                    originalQuery: query,
                    conversationId: message.conversationId || "",
                  };

                  addAssistantMessage(message.content, "clarification", {
                    clarificationResponse,
                  });

                  options.onClarification?.(clarificationResponse);
                } else {
                  // Regular answer
                  setIsWaitingForClarification(false);

                  const finalText = accumulatedText || message.content;
                  const finalCitations =
                    message.sources && message.sources.length > 0
                      ? message.sources.map((s, i) => convertToCitation(s, i))
                      : accumulatedCitations;

                  const finalResponse: SynthesizedResponse = {
                    success: true,
                    mode: "synthesized",
                    query,
                    conversationId:
                      message.conversationId || conversationIdRef.current || "",
                    expandedQueries: expandedQueries,
                    answer: {
                      text: finalText,
                      citations: finalCitations,
                      confidence: "medium",
                      modelUsed: "unknown",
                    },
                    retrieval: {
                      total: finalCitations.length,
                      chunks: [],
                    },
                    processingTimeMs: 0,
                  };

                  addAssistantMessage(finalText, "answer", {
                    synthesizedResponse: finalResponse,
                  });

                  options.onComplete?.(finalResponse);
                }
                break;
              }

              case "error": {
                receivedCompleteEvent = true;
                addAssistantMessage(`Error: ${message.message}`, "error");
                options.onError?.(message.message);
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
          expandedQueries: expandedQueries,
          conversationId: conversationIdRef.current || "",
          answer: {
            text: accumulatedText,
            citations: accumulatedCitations.length > 0 ? accumulatedCitations : placeholderCitations,
            confidence: "low",
            modelUsed: "unknown"
          },
          retrieval: {
            total: accumulatedCitations.length || placeholderCitations.length,
            chunks: []
          },
          processingTimeMs: 0
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
