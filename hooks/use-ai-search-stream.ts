"use client";

import { useState, useCallback, useRef } from "react";
import { AskCitation } from "@/lib/ask";

export interface AISearchMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  type: "text" | "answer" | "error" | "loading";
  sources?: AISearchSource[];
}

export interface AISearchSource {
  video_id: string;
  title: string;
  timestamp: number;
  timestamp_end?: number;
  text: string;
  playback_id?: string;
  speaker?: string;
  cited?: boolean;
}

interface AIContextMessage {
  role: "user" | "assistant";
  content: string;
}

interface UseAISearchStreamOptions {
  onComplete?: (answer: string, sources: AISearchSource[]) => void;
  onError?: (error: string) => void;
}

export function useAISearchStream(options: UseAISearchStreamOptions = {}) {
  const [messages, setMessages] = useState<AISearchMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [context, setContext] = useState<AIContextMessage[]>([]);
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
        const response = await fetch("/api/ai-search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            prompt: query,
            limit: 5,
            context: context.length > 0 ? context : undefined,
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
        let accumulatedSources: AISearchSource[] = [];
        let newContext: AIContextMessage[] = [];

        const processLine = (line: string) => {
          if (!line.startsWith("data: ")) return;

          const dataStr = line.slice(6).trim();
          if (!dataStr || dataStr === "[DONE]") return;

          try {
            const event = JSON.parse(dataStr);

            switch (event.type) {
              case "text_delta":
                accumulatedResponse += event.delta;
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

              case "message_complete":
                if (event.sources && event.sources.length > 0) {
                  accumulatedSources = event.sources;
                }
                if (event.context) {
                  newContext = event.context;
                }
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === messageId
                      ? {
                          ...msg,
                          content: accumulatedResponse || msg.content,
                          type: "answer",
                          sources: accumulatedSources,
                        }
                      : msg
                  )
                );
                if (newContext.length > 0) {
                  setContext(newContext);
                }
                options.onComplete?.(accumulatedResponse, accumulatedSources);
                break;

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
                break;
            }
          } catch (err) {
            if (
              process.env.NODE_ENV === "development" &&
              !(err instanceof SyntaxError)
            ) {
              console.warn("[AI Search] Unexpected error parsing SSE:", err);
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
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            processLine(line);
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
    [addUserMessage, context, options]
  );

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setContext([]);
    setIsStreaming(false);
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
    streamQuestion,
    reset,
    stop,
  };
}

export function sourceToCitation(
  source: AISearchSource,
  index: number
): AskCitation {
  const startMs = (source.timestamp || 0) * 1000;
  const endMs = (source.timestamp_end || source.timestamp || 0) * 1000;

  return {
    id: `${source.video_id}_${startMs}_${index}`,
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
