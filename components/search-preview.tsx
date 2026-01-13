"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Play,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { SearchHit } from "@/lib/search";
import { getCanonicalVideoPath } from "@/lib/video-path";

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function parseHighlightedText(text: string) {
  const parts = text.split(/(<mark>.*?<\/mark>)/g);

  return parts.map((part, index) => {
    if (part.startsWith("<mark>") && part.endsWith("</mark>")) {
      const markedText = part.slice(6, -7);
      return (
        <mark
          key={index}
          className="bg-primary text-primary-foreground font-medium rounded px-1"
        >
          {markedText}
        </mark>
      );
    }
    return part;
  });
}

export function SearchPreview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isSearchPage = pathname === "/s";
  const isAskPage = pathname === "/coach";

  // Get the current query from the URL
  const query = searchParams?.get("q") || "";

  const [results, setResults] = useState<SearchHit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [expandedVideos, setExpandedVideos] = useState<Record<string, boolean>>(
    {}
  );

  // Fetch search results when query changes
  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      setError(undefined);

      try {
        const response = await fetch("/api/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
        });

        if (!response.ok) {
          throw new Error(`Search failed with status ${response.status}`);
        }

        const data = await response.json();
        setResults(data.hits || []);
      } catch (err) {
        console.error("[Search Preview] Error:", err);
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  const displayedResults = results.slice(0, 3);
  const hasMoreResults = results.length > 3;

  const toggleExpand = (videoId: string) => {
    setExpandedVideos((prev) => ({
      ...prev,
      [videoId]: !prev[videoId],
    }));
  };

  const getVisibleSegments = (hit: SearchHit) => {
    if (!hit.segments) return [];
    return expandedVideos[hit.internal_id]
      ? hit.segments
      : hit.segments.slice(0, 2);
  };

  // Don't show search preview on search or ask pages
  if (isSearchPage || isAskPage) return null;

  // Don't show if no query
  if (!query) return null;

  return (
    <div className="w-full bg-sidebar text-sidebar-foreground">
      <div className="container mx-auto py-5">
        <div className="max-w-4xl mx-auto min-h-[160px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary/60" />
            </div>
          ) : error ? (
            <div className="py-8 px-4 flex flex-col items-center justify-center text-sm">
              <p className="font-medium text-lg text-destructive">
                Search Error
              </p>
              <p className="text-sm mt-2 text-muted-foreground text-center max-w-xs">
                {error}
              </p>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-4">
              {displayedResults.map((hit, index) => (
                <div
                  key={`${hit.internal_id}-${index}`}
                  className="p-4 rounded-lg hover:bg-background transition-colors"
                >
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="relative flex-shrink-0 w-full sm:w-auto">
                      <Link
                        href={getCanonicalVideoPath(hit.short_id || hit.internal_id)}
                        className="block group"
                      >
                        {hit.thumbnail ? (
                          <Image
                            src={hit.thumbnail}
                            alt={hit.title}
                            width={200}
                            height={112}
                            className="rounded-md object-cover aspect-video w-full sm:w-[200px] group-hover:ring-1 ring-primary transition-all"
                          />
                        ) : (
                          <div className="w-full sm:w-[200px] aspect-video bg-muted rounded-md" />
                        )}
                        {hit.duration && (
                          <div className="absolute bottom-2 right-2 bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-md">
                            {formatTime(hit.duration)}
                          </div>
                        )}
                      </Link>
                    </div>
                    <div className="flex-1 min-w-0 w-full">
                      <Link
                        href={getCanonicalVideoPath(hit.short_id || hit.internal_id)}
                        className="block group"
                      >
                        <h3 className="text-xl font-semibold mb-2 group-hover:text-primary">
                          {hit.title || "Untitled"}
                        </h3>
                      </Link>

                      {hit.segments && hit.segments.length > 0 && (
                        <div className="space-y-2">
                          <div className="space-y-1.5">
                            {getVisibleSegments(hit).map((segment, idx) => (
                              <Link
                                key={`${hit.internal_id}-segment-${idx}`}
                                href={`${getCanonicalVideoPath(hit.short_id || hit.internal_id)}?t=${Math.floor(segment.start_time)}`}
                                className="block py-1.5 hover:bg-primary/10 dark:hover:bg-primary/20 rounded-md -mx-2 px-2"
                              >
                                <div className="flex items-start gap-2.5">
                                  <div className="flex items-center gap-1.5 bg-primary/10 dark:bg-primary/20 text-primary text-xs px-2.5 py-1 rounded-full mt-0.5">
                                    <Play size={12} className="ml-0.5" />
                                    <span>
                                      {formatTime(segment.start_time)}
                                    </span>
                                  </div>
                                  <div className="text-base">
                                    {parseHighlightedText(
                                      segment.highlighted_text || segment.text
                                    )}
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>

                          {hit.segments.length > 2 && (
                            <button
                              onClick={() => toggleExpand(hit.internal_id)}
                              className="text-xs flex items-center gap-1 text-primary hover:text-primary font-medium"
                            >
                              {expandedVideos[hit.internal_id] ? (
                                <>
                                  <ChevronUp size={14} />
                                  <span>Show less</span>
                                </>
                              ) : (
                                <>
                                  <ChevronDown size={14} />
                                  <span>
                                    Show {hit.segments.length - 2} more matches
                                  </span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {hasMoreResults && (
                <div className="flex justify-center pt-1">
                  <Link
                    href={`/s?q=${encodeURIComponent(query)}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary transition-colors"
                  >
                    <span>See all {results.length} results</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </div>
          ) : (
            !isLoading && (
              <div className="py-8 px-4 flex flex-col items-center justify-center text-sm">
                <p className="font-medium text-lg">No matches found</p>
                <p className="text-sm mt-2 text-muted-foreground text-center max-w-xs">
                  Try searching for keywords from your videos
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
