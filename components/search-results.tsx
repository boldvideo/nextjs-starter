"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { SearchHit } from "@/lib/search";
import { formatTime } from "@/lib/utils";

/**
 * Individual search result component
 */
function SearchResult({ hit }: { hit: SearchHit }) {
  return (
    <div className="p-6 rounded-lg hover:bg-background transition-colors">
      <div className="flex flex-col sm:flex-row items-start gap-6">
        <div className="relative flex-shrink-0 w-full sm:w-auto mb-3 sm:mb-0">
          <Link
            href={`/v/${hit.video_id}`}
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
            href={`/v/${hit.video_id}`}
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
                  key={`${hit.video_id}-segment-${idx}`}
                  href={`/v/${hit.video_id}?t=${Math.floor(
                    segment.start_time
                  )}`}
                  className="block py-2 hover:bg-accent rounded-md -mx-2 px-2"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-2 bg-accent text-accent-foreground text-sm px-3 py-1.5 rounded-full mt-0.5">
                      <Play size={14} className="ml-0.5" />
                      <span>{formatTime(segment.start_time)}</span>
                    </div>
                    <div
                      className="text-base"
                      dangerouslySetInnerHTML={{
                        __html: segment.highlighted_text || segment.text,
                      }}
                    />
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
function LoadingResults() {
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
function EmptyQueryState() {
  return (
    <div>
      <p className="text-lg text-muted-foreground">
        Enter a search term in the search bar above to find videos
      </p>
    </div>
  );
}

/**
 * Error state component
 */
function ErrorState({ message }: { message: string }) {
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
function NoResultsState() {
  return (
    <div className="py-12 px-4 flex flex-col items-center justify-center">
      <p className="font-medium text-lg">No matches found</p>
      <p className="text-sm mt-2 text-muted-foreground text-center max-w-xs">
        Try searching for different keywords from your videos
      </p>
    </div>
  );
}

export function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams?.get("q") || "";

  const [results, setResults] = useState<SearchHit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

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

  if (!query) {
    return <EmptyQueryState />;
  }

  return (
    <div>
      {isLoading ? (
        <LoadingResults />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <>
          {results.length > 0 ? (
            <>
              <p className="text-lg text-muted-foreground mb-8">
                {results.length} {results.length === 1 ? "match" : "matches"}{" "}
                for &ldquo;{query}&rdquo;
              </p>
              <div className="space-y-6">
                {results.map((hit, index) => (
                  <SearchResult key={`${hit.video_id}-${index}`} hit={hit} />
                ))}
              </div>
            </>
          ) : (
            <NoResultsState />
          )}
        </>
      )}
    </div>
  );
}
