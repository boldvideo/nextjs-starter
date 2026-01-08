"use client";

import { useState, useCallback, useRef } from "react";
import type { SSEEvent } from "./sse-event-log";

interface RecommendPlaygroundOptions {
  limit?: number;
  collectionId?: string;
  tags?: string[];
  includeGuidance?: boolean;
  context?: string;
}

interface RecommendedVideo {
  videoId: string;
  title: string;
  playbackId?: string;
  relevance?: number;
  reason?: string;
}

interface TopicRecommendation {
  topic: string;
  videos: RecommendedVideo[];
}

interface Source {
  id: string;
  videoId: string;
  title: string;
  text: string;
  timestamp: number;
  timestampEnd: number;
  playbackId: string;
  speaker?: string;
}

interface RecommendResult {
  id?: string;
  recommendations: TopicRecommendation[];
  guidance?: string;
  sources: Source[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export function useRecommendPlayground() {
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const addEvent = useCallback((type: string, data: unknown) => {
    setEvents((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: Date.now(),
        type,
        data,
      },
    ]);
  }, []);

  const submit = useCallback(
    async (topics: string[], options: RecommendPlaygroundOptions = {}) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setIsLoading(true);
      setEvents([]);
      setResult(null);
      setError(null);

      try {
        const response = await fetch("/api/ai-recommend", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            topics,
            limit: options.limit || 5,
            collection_id: options.collectionId || undefined,
            tags: options.tags?.length ? options.tags : undefined,
            include_guidance: options.includeGuidance ?? true,
            context: options.context || undefined,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        
        let conversationId: string | undefined;
        let recommendations: TopicRecommendation[] = [];
        let sources: Source[] = [];
        let guidance = "";
        let usage: { inputTokens: number; outputTokens: number } | undefined;

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            if (buffer.trim()) {
              const lines = buffer.split("\n");
              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const dataStr = line.slice(6).trim();
                  if (dataStr && dataStr !== "[DONE]") {
                    try {
                      const event = JSON.parse(dataStr);
                      addEvent(event.type || "unknown", event);
                    } catch {
                      // ignore parse errors
                    }
                  }
                }
              }
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;

            if (dataStr === "[DONE]") {
              addEvent("done", { message: "Stream complete" });
              continue;
            }

            try {
              const event = JSON.parse(dataStr);
              addEvent(event.type || "unknown", event);

              switch (event.type) {
                case "message_start":
                  conversationId = event.id;
                  break;
                case "sources":
                  sources = event.sources || [];
                  break;
                case "recommendations":
                  recommendations = event.recommendations || [];
                  break;
                case "text_delta":
                  guidance += event.delta || "";
                  break;
                case "message_complete":
                  conversationId = event.id || conversationId;
                  recommendations = event.recommendations || recommendations;
                  guidance = event.guidance || guidance;
                  sources = event.sources || sources;
                  usage = event.usage;
                  break;
                case "error":
                  setError(event.message || "Unknown error");
                  break;
              }
            } catch {
              // ignore parse errors
            }
          }
        }

        reader.releaseLock();
        setResult({ 
          id: conversationId, 
          recommendations, 
          guidance: guidance || undefined, 
          sources,
          usage 
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        const message = err instanceof Error ? err.message : "Request failed";
        setError(message);
        addEvent("error", { message });
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [addEvent]
  );

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
    setEvents([]);
    setResult(null);
    setError(null);
  }, []);

  return {
    isLoading,
    events,
    result,
    error,
    submit,
    reset,
  };
}
