"use client";

import { useState, useCallback, useRef } from "react";
import type { SSEEvent } from "./sse-event-log";

interface SearchPlaygroundOptions {
  limit?: number;
}

interface SearchSource {
  video_id: string;
  title: string;
  timestamp: number;
  timestamp_end?: number;
  text: string;
  playback_id?: string;
  speaker?: string;
}

interface SearchResult {
  content: string;
  sources: SearchSource[];
}

export function useSearchPlayground() {
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [result, setResult] = useState<SearchResult | null>(null);
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
    async (prompt: string, options: SearchPlaygroundOptions = {}) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setIsLoading(true);
      setEvents([]);
      setResult(null);
      setError(null);

      try {
        const response = await fetch("/api/ai-search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            prompt,
            limit: options.limit || 5,
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
        let accumulatedContent = "";
        let sources: SearchSource[] = [];

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
                case "text_delta":
                  accumulatedContent += event.delta || "";
                  break;
                case "sources":
                  sources = event.sources || [];
                  break;
                case "message_complete":
                  accumulatedContent = event.content || accumulatedContent;
                  sources = event.sources || sources;
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
        setResult({ content: accumulatedContent, sources });
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
