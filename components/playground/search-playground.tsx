"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PlaygroundInput } from "./playground-input";
import { SSEEventLog } from "./sse-event-log";
import { JsonViewer } from "./json-viewer";
import { useSearchPlayground } from "./use-search-playground";

export function SearchPlayground() {
  const [limit, setLimit] = useState(5);
  const { isLoading, events, result, error, submit, reset } = useSearchPlayground();

  const handleSubmit = (query: string) => {
    submit(query, { limit });
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="space-y-4 p-4 border border-zinc-800 rounded-lg bg-zinc-900/50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">AI Search</h2>
          <button
            onClick={reset}
            className="text-sm text-zinc-400 hover:text-zinc-100"
          >
            Reset
          </button>
        </div>

        {/* Limit Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">
            Result Limit
          </label>
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(Math.max(1, Math.min(20, parseInt(e.target.value) || 5)))}
            min={1}
            max={20}
            className={cn(
              "w-24 px-3 py-2 rounded-md border border-zinc-700 bg-zinc-900 text-sm text-zinc-100",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            )}
          />
        </div>

        {/* Query Input */}
        <PlaygroundInput
          onSubmit={handleSubmit}
          isLoading={isLoading}
          placeholder="Search your video library..."
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 border border-red-500/50 bg-red-500/10 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SSE Event Log */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-400">
            SSE Events ({events.length})
          </h3>
          <SSEEventLog events={events} className="h-[400px]" />
        </div>

        {/* Formatted Result */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-400">
            Formatted Result
          </h3>
          <div className="h-[400px] overflow-auto border border-zinc-800 rounded-lg p-4 bg-zinc-900/50">
            {result ? (
              <div className="space-y-4">
                {/* Answer */}
                <div>
                  <h4 className="text-xs font-medium text-zinc-500 mb-2">
                    Answer
                  </h4>
                  <p className="text-sm text-zinc-100 whitespace-pre-wrap">{result.content}</p>
                </div>

                {/* Sources */}
                {result.sources.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-zinc-500 mb-2">
                      Sources ({result.sources.length})
                    </h4>
                    <div className="space-y-2">
                      {result.sources.map((source, i) => (
                        <div
                          key={`${source.video_id}-${i}`}
                          className="text-xs p-2 bg-zinc-800 rounded"
                        >
                          <div className="font-medium text-zinc-200">{source.title}</div>
                          <div className="text-zinc-400">
                            {source.timestamp}s - {source.text.slice(0, 100)}...
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw JSON */}
                <div>
                  <h4 className="text-xs font-medium text-zinc-500 mb-2">
                    Raw Response
                  </h4>
                  <JsonViewer data={result} />
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                No result yet. Submit a query to see the response.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
