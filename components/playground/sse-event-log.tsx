"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface SSEEvent {
  id: string;
  timestamp: number;
  type: string;
  data: unknown;
}

interface SSEEventLogProps {
  events: SSEEvent[];
  className?: string;
}

export function SSEEventLog({ events, className }: SSEEventLogProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "font-mono text-xs bg-zinc-900 text-zinc-100 rounded-lg p-4 overflow-auto",
        className
      )}
    >
      {events.length === 0 ? (
        <p className="text-zinc-500">No events yet. Submit a query to see SSE events.</p>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <div key={event.id} className="border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2 text-zinc-400 mb-1">
                <span className="text-zinc-600">
                  {new Date(event.timestamp).toISOString().slice(11, 23)}
                </span>
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-medium",
                    event.type === "error"
                      ? "bg-red-900/50 text-red-300"
                      : event.type === "text_delta"
                        ? "bg-blue-900/50 text-blue-300"
                        : event.type === "sources"
                          ? "bg-green-900/50 text-green-300"
                          : event.type === "topic_start"
                            ? "bg-purple-900/50 text-purple-300"
                            : event.type === "video"
                              ? "bg-cyan-900/50 text-cyan-300"
                              : "bg-zinc-800 text-zinc-300"
                  )}
                >
                  {event.type}
                </span>
              </div>
              <pre className="text-zinc-300 whitespace-pre-wrap break-all">
                {JSON.stringify(event.data, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
