"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { SearchHit } from "@/lib/search";

/**
 * Formats seconds into MM:SS format
 */
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

/**
 * Parses text with <mark> tags and converts to React components
 */
function parseHighlightedText(text: string): React.ReactNode[] {
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

/**
 * Individual search result component
 */
function SearchResult({ hit }: { hit: SearchHit }): React.JSX.Element {
  return (
    <div className="p-6 rounded-lg hover:bg-background transition-colors">
      <div className="flex flex-col sm:flex-row items-start gap-6">
        <div className="relative flex-shrink-0 w-full sm:w-auto mb-3 sm:mb-0">
          <Link
            href={`/v/${hit.short_id || hit.internal_id}`}
            className="block group"
          >
            {hit.thumbnail ? (
              <Image
                src={hit.thumbnail}
                alt={hit.title}
                width={240}
                height={135}
                className="rounded-md object-cover aspect-video w-full sm:w-[240px] group-hover:ring-1 ring-primary transition-all"
              />
            ) : (
              <div className="w-full sm:w-[240px] aspect-video bg-muted rounded-md" />
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
            href={`/v/${hit.short_id || hit.internal_id}`}
            className="block group"
          >
            <h3 className="text-2xl font-semibold mb-3 group-hover:text-primary">
              {hit.title || "Untitled"}
            </h3>
          </Link>
          {hit.description && (
            <p className="text-base text-muted-foreground mb-4">
              {hit.description}
            </p>
          )}

          {hit.segments && hit.segments.length > 0 && (
            <div className="space-y-2">
              {hit.segments.map((segment, idx) => (
                <Link
                  key={`${hit.internal_id}-segment-${idx}`}
                  href={`/v/${hit.short_id || hit.internal_id}?t=${Math.floor(
                    segment.start_time
                  )}`}
                  className="block py-2 hover:bg-accent rounded-md -mx-2 px-2"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-2 bg-accent text-accent-foreground text-sm px-3 py-1.5 rounded-full mt-0.5">
                      <Play size={14} className="ml-0.5" />
                      <span>{formatTime(segment.start_time)}</span>
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
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Loading state component
 */
function LoadingResults(): React.JSX.Element {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary/60" />
        <p className="text-muted-foreground">Searching...</p>
      </div>
    </div>
  );
}

/**
 * Empty state when no query is provided
 */
function EmptyQueryState(): React.JSX.Element {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Search</h1>
        <p className="text-lg text-muted-foreground">
          Enter a search term in the search bar above to find videos
        </p>
      </div>
    </div>
  );
}

/**
 * Error state component
 */
function ErrorState({ message }: { message: string }): React.JSX.Element {
  return (
    <div>
      <p className="text-lg text-destructive mb-8">Error: {message}</p>
      <div className="py-12 px-4 flex flex-col items-center justify-center">
        <p className="text-lg">Please try again later</p>
      </div>
    </div>
  );
}

/**
 * No results state component
 */
function NoResultsState(): React.JSX.Element {
  return (
    <div className="py-12 px-4 flex flex-col items-center justify-center">
      <p className="font-medium text-lg">No matches found</p>
      <p className="text-sm mt-2 text-muted-foreground text-center max-w-xs">
        Try searching for different keywords from your videos
      </p>
    </div>
  );
}

/**
 * Main search page component
 */
export default function SearchPage(): React.JSX.Element {
  // Get query directly from URL - this is our only source of truth
  const searchParams = useSearchParams();
  const query = searchParams?.get("q") || "";

  const [results, setResults] = useState<SearchHit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Fetch search results on query change
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
        console.error("[Search Page] Error:", err);
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  // If no query, show empty state
  if (!query) {
    return <EmptyQueryState />;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Results Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Search Results</h1>

          {isLoading ? (
            <LoadingResults />
          ) : error ? (
            <ErrorState message={error} />
          ) : (
            <>
              <p className="text-lg text-muted-foreground mb-8">
                {results.length} {results.length === 1 ? "match" : "matches"}{" "}
                for &ldquo;{query}&rdquo;
              </p>

              <div className="space-y-6">
                {results.length > 0 ? (
                  results.map((hit, index) => (
                    <SearchResult
                      key={`${hit.internal_id}-${index}`}
                      hit={hit}
                    />
                  ))
                ) : (
                  <NoResultsState />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
