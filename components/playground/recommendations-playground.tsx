"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SSEEventLog } from "./sse-event-log";
import { JsonViewer } from "./json-viewer";
import { useRecommendPlayground } from "./use-recommend-playground";

export function RecommendationsPlayground() {
  const [topicsInput, setTopicsInput] = useState("");
  const [limit, setLimit] = useState(5);
  const [collectionId, setCollectionId] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [includeGuidance, setIncludeGuidance] = useState(true);
  const [context, setContext] = useState("");

  const { isLoading, events, result, error, submit, reset } = useRecommendPlayground();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const topics = topicsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (topics.length === 0) return;

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    submit(topics, {
      limit,
      collectionId: collectionId || undefined,
      tags: tags.length ? tags : undefined,
      includeGuidance,
      context: context || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <form onSubmit={handleSubmit} className="space-y-4 p-4 border border-zinc-800 rounded-lg bg-zinc-900/50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">AI Recommendations</h2>
          <button
            type="button"
            onClick={reset}
            className="text-sm text-zinc-400 hover:text-zinc-100"
          >
            Reset
          </button>
        </div>

        {/* Topics Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">
            Topics (comma-separated) *
          </label>
          <input
            type="text"
            value={topicsInput}
            onChange={(e) => setTopicsInput(e.target.value)}
            placeholder="e.g., JavaScript basics, React hooks, TypeScript"
            disabled={isLoading}
            className={cn(
              "w-full px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
              "disabled:opacity-50 placeholder:text-zinc-500"
            )}
          />
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Limit */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">
              Limit (1-20)
            </label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(Math.max(1, Math.min(20, parseInt(e.target.value) || 5)))}
              min={1}
              max={20}
              disabled={isLoading}
              className={cn(
                "w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-900 text-sm text-zinc-100",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
                "disabled:opacity-50"
              )}
            />
          </div>

          {/* Collection ID */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">
              Collection ID (optional)
            </label>
            <input
              type="text"
              value={collectionId}
              onChange={(e) => setCollectionId(e.target.value)}
              placeholder="col_xxxxx"
              disabled={isLoading}
              className={cn(
                "w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-900 text-sm text-zinc-100",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
                "disabled:opacity-50 placeholder:text-zinc-500"
              )}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">
              Tags (comma-separated, optional)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g., beginner, tutorial"
              disabled={isLoading}
              className={cn(
                "w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-900 text-sm text-zinc-100",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
                "disabled:opacity-50 placeholder:text-zinc-500"
              )}
            />
          </div>
        </div>

        {/* Context */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">
            User Context (optional)
          </label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="e.g., I'm preparing for a technical interview and need to brush up on fundamentals"
            disabled={isLoading}
            rows={2}
            className={cn(
              "w-full px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100 resize-none",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
              "disabled:opacity-50 placeholder:text-zinc-500"
            )}
          />
        </div>

        {/* Include Guidance Toggle + Submit */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeGuidance}
              onChange={(e) => setIncludeGuidance(e.target.checked)}
              disabled={isLoading}
              className="rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500/50"
            />
            <span className="text-zinc-400">Include AI guidance</span>
          </label>

          <button
            type="submit"
            disabled={isLoading || !topicsInput.trim()}
            className={cn(
              "px-4 py-2 rounded-lg font-medium",
              "bg-blue-600 text-white",
              "hover:bg-blue-500",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isLoading ? "Loading..." : "Get Recommendations"}
          </button>
        </div>
      </form>

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
          <SSEEventLog events={events} className="h-[500px]" />
        </div>

        {/* Formatted Result */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-400">
            Formatted Result
          </h3>
          <div className="h-[500px] overflow-auto border border-zinc-800 rounded-lg p-4 bg-zinc-900/50">
            {result ? (
              <div className="space-y-6">
                {/* Guidance */}
                {result.guidance && (
                  <div>
                    <h4 className="text-xs font-medium text-zinc-500 mb-2">
                      Learning Path Guidance
                    </h4>
                    <p className="text-sm text-zinc-100 whitespace-pre-wrap">{result.guidance}</p>
                  </div>
                )}

                {/* Recommendations by Topic */}
                {result.recommendations.map((rec, i) => (
                  <div key={`${rec.topic}-${i}`} className="space-y-3">
                    <h4 className="text-sm font-semibold text-zinc-100 border-b border-zinc-700 pb-1">
                      {rec.topic}
                    </h4>

                    {/* Videos */}
                    <div className="space-y-2">
                      {rec.videos.length === 0 ? (
                        <div className="text-xs text-zinc-500 italic">No videos found for this topic</div>
                      ) : (
                        rec.videos.map((video, j) => (
                          <div
                            key={`${video.videoId}-${j}`}
                            className="text-xs p-2 bg-zinc-800 rounded"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-zinc-200 truncate">{video.title}</div>
                                {video.reason && (
                                  <div className="text-zinc-400 mt-1">
                                    {video.reason}
                                  </div>
                                )}
                              </div>
                              {video.relevance !== undefined && (
                                <div className="text-zinc-500 shrink-0">
                                  {Math.round(video.relevance * 100)}%
                                </div>
                              )}
                            </div>
                            <div className="text-zinc-600 text-[10px] mt-1">
                              ID: {video.videoId}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}

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
                No result yet. Enter topics and submit to see recommendations.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
