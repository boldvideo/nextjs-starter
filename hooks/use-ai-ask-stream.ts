"use client";

import { useState, useCallback, useRef } from "react";
import { AskCitation } from "@/lib/ask";

export interface AIAskMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  type: "text" | "answer" | "error" | "loading";
  sources?: AIAskSource[];
}

export interface AIAskSource {
  id?: string;
  video_id: string;
  title: string;
  timestamp: number;
  timestamp_end?: number;
  text: string;
  playback_id?: string;
  speaker?: string;
  cited?: boolean;
}

interface SDKSegment {
  id: string;
  videoId: string;
  title: string;
  text: string;
  timestamp: number;
  timestampEnd: number;
  playbackId: string;
  speaker?: string;
  cited?: boolean;
}

interface ConversationHistoryMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SDKSegment[];
  insertedAt: string;
}

interface ConversationMetadata {
  originalQuery: string;
  status?: string;
  confidence?: string;
  chunksFound?: number;
}

interface ConversationHistory {
  conversationId: string;
  messages: ConversationHistoryMessage[];
  metadata?: ConversationMetadata;
}

function normalizeSegmentToSource(segment: SDKSegment): AIAskSource {
  return {
    id: segment.id,
    video_id: segment.videoId,
    title: segment.title,
    text: segment.text,
    timestamp: segment.timestamp,
    timestamp_end: segment.timestampEnd,
    playback_id: segment.playbackId,
    speaker: segment.speaker,
    cited: segment.cited,
  };
}

interface UseAIAskStreamOptions {
  onComplete?: (answer: string, sources: AIAskSource[]) => void;
  onError?: (error: string) => void;
}

export function useAIAskStream(options: UseAIAskStreamOptions = {}) {
  const [messages, setMessages] = useState<AIAskMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);

  const addUserMessage = useCallback((content: string) => {
    const messageId = `user-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: messageId,
        role: "user",
        content,
        type: "text",
      },
    ]);
    return messageId;
  }, []);

  const streamQuestion = useCallback(
    async (query: string) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const messageId = `assistant-${Date.now()}`;
      streamingMessageIdRef.current = messageId;

      addUserMessage(query);

      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          role: "assistant",
          content: "",
          type: "loading",
          sources: [],
        },
      ]);

      setIsStreaming(true);

      try {
        const response = await fetch("/api/ai-ask", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            prompt: query,
            conversationId,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulatedResponse = "";
        let accumulatedSources: AIAskSource[] = [];
        let seenTerminalEvent = false;
        let didInvokeOnComplete = false;

        const processLine = (line: string) => {
          if (!line.startsWith("data: ")) return;

          const dataStr = line.slice(6).trim();
          if (!dataStr) return;

          if (dataStr === "[DONE]") {
            seenTerminalEvent = true;
            return;
          }

          try {
            const event = JSON.parse(dataStr);

            switch (event.type) {
              case "message_start":
                if (event.id) {
                  setConversationId(event.id);
                }
                break;

              case "text_delta":
                accumulatedResponse += event.delta ?? "";
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === messageId
                      ? { ...msg, content: accumulatedResponse, type: "answer" }
                      : msg
                  )
                );
                break;

              case "sources":
                accumulatedSources = event.sources || [];
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === messageId
                      ? { ...msg, sources: accumulatedSources }
                      : msg
                  )
                );
                break;

              case "message_complete": {
                if (event.conversationId) {
                  setConversationId(event.conversationId);
                }

                // Check if this is a clarification (camelCase from server)
                if (event.responseType === "clarification") {
                  // Clarification: the question is in content, no sources
                  const clarificationContent = event.content || "";
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === messageId
                        ? { ...msg, content: clarificationContent, type: "answer" }
                        : msg
                    )
                  );
                  if (!didInvokeOnComplete) {
                    didInvokeOnComplete = true;
                    options.onComplete?.(clarificationContent, []);
                  }
                } else {
                  // Regular answer
                  const finalContent = accumulatedResponse || event.content;
                  
                  // Merge final sources with accumulated sources to preserve titles/playback_id
                  // Final sources have id/cited but may lack title; accumulated sources have full metadata
                  if (event.sources && event.sources.length > 0) {
                    const finalSources: AIAskSource[] = event.sources;
                    // Merge: use final source but fill in missing fields from accumulated
                    accumulatedSources = finalSources.map((finalSrc) => {
                      // Find matching source from accumulated by video_id and text overlap
                      const origSrc = accumulatedSources.find(
                        (s) => s.video_id === finalSrc.video_id && s.text === finalSrc.text
                      );
                      return {
                        ...origSrc,
                        ...finalSrc,
                        title: finalSrc.title || origSrc?.title || "Untitled",
                        playback_id: finalSrc.playback_id || origSrc?.playback_id,
                        timestamp: finalSrc.timestamp ?? origSrc?.timestamp ?? 0,
                        timestamp_end: finalSrc.timestamp_end ?? origSrc?.timestamp_end,
                      };
                    });
                  }
                  
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === messageId
                        ? {
                            ...msg,
                            content: finalContent || msg.content,
                            type: "answer",
                            sources: accumulatedSources,
                          }
                        : msg
                    )
                  );
                  if (!didInvokeOnComplete) {
                    didInvokeOnComplete = true;
                    options.onComplete?.(finalContent, accumulatedSources);
                  }
                }
                seenTerminalEvent = true;
                break;
              }

              case "error":
                if (!accumulatedResponse) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === messageId
                        ? {
                            ...msg,
                            content: event.message || "An error occurred",
                            type: "error",
                          }
                        : msg
                    )
                  );
                  options.onError?.(event.message || "An error occurred");
                }
                seenTerminalEvent = true;
                break;
            }
          } catch (err) {
            if (
              process.env.NODE_ENV === "development" &&
              !(err instanceof SyntaxError)
            ) {
              console.warn("[AI Ask] Unexpected error parsing SSE:", err);
            }
          }
        };

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            if (buffer.trim()) {
              const remainingLines = buffer.split("\n");
              for (const line of remainingLines) {
                processLine(line);
              }
            }

            if (accumulatedResponse && streamingMessageIdRef.current === messageId && !didInvokeOnComplete) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === messageId
                    ? {
                        ...msg,
                        content: accumulatedResponse,
                        type: "answer",
                        sources: accumulatedSources,
                      }
                    : msg
                )
              );
              options.onComplete?.(accumulatedResponse, accumulatedSources);
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            processLine(line);
          }

          if (seenTerminalEvent) {
            try {
              await reader.cancel();
            } catch {
              // ignore
            }
            break;
          }
        }

        reader.releaseLock();
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get response";
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, content: errorMessage, type: "error" }
              : msg
          )
        );
        options.onError?.(errorMessage);
      } finally {
        setIsStreaming(false);
        streamingMessageIdRef.current = null;
        abortControllerRef.current = null;
      }
    },
    [addUserMessage, conversationId, options]
  );

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setConversationId(undefined);
    setIsStreaming(false);
    streamingMessageIdRef.current = null;
  }, []);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  }, []);

  const loadConversation = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/ai-ask/${id}`);

      if (!response.ok) {
        return false;
      }

      const data: ConversationHistory = await response.json();

      // Convert history messages to our format, normalizing SDK camelCase sources to snake_case
      const loadedMessages: AIAskMessage[] = [];

      // Backend may not include user messages - synthesize from metadata.originalQuery
      // if the first message is an assistant message
      const hasUserMessage = data.messages.some((m) => m.role === "user");
      if (!hasUserMessage && data.metadata?.originalQuery) {
        loadedMessages.push({
          id: `user-${data.conversationId}`,
          role: "user",
          content: data.metadata.originalQuery,
          type: "text",
        });
      }

      for (const msg of data.messages) {
        loadedMessages.push({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          type: msg.role === "user" ? "text" : "answer",
          sources: msg.sources?.map(normalizeSegmentToSource),
        });
      }

      setMessages(loadedMessages);
      setConversationId(data.conversationId);
      return true;
    } catch (error) {
      console.error("[useAIAskStream] Failed to load conversation:", error);
      return false;
    }
  }, []);

  return {
    messages,
    isStreaming,
    conversationId,
    streamQuestion,
    reset,
    stop,
    loadConversation,
  };
}

export function askSourceToCitation(
  source: AIAskSource,
  index: number
): AskCitation {
  const startMs = (source.timestamp || 0) * 1000;
  const endMs = (source.timestamp_end || source.timestamp || 0) * 1000;

  return {
    id: source.id || `${source.video_id}_${startMs}_${index}`,
    relevanceScore: 1 - index * 0.1,
    relevanceRank: index + 1,
    videoId: source.video_id,
    playbackId: source.playback_id || "",
    videoTitle: source.title,
    timestampStart: formatTimestamp(startMs),
    timestampEnd: formatTimestamp(endMs),
    startMs: startMs,
    endMs: endMs,
    speaker: source.speaker || "Speaker",
    text: source.text,
    transcriptExcerpt: source.text,
    cited: source.cited ?? true,
  };
}

function formatTimestamp(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
