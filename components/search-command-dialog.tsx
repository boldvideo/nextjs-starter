"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  X,
  Sparkles,
  ArrowRight,
  Command,
  Loader2,
  Play,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useSearch } from "@/components/providers/search-provider";
import { cn } from "@/lib/utils";
import { SearchHit } from "@/lib/search";

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
          className="bg-primary/20 text-primary font-semibold rounded-sm px-0.5"
        >
          {markedText}
        </mark>
      );
    }
    return part;
  });
}

export function SearchCommandDialog() {
  const router = useRouter();
  const { isOpen, setIsOpen, mode, setMode } = useSearch();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [expandedVideos, setExpandedVideos] = useState<Record<string, boolean>>(
    {}
  );

  // Handle mounting for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      // Slightly longer delay to ensure render and transition
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);

      // Lock body scroll
      document.body.style.overflow = "hidden";
      return () => clearTimeout(timer);
    } else {
      setQuery("");
      setResults([]);
      // Unlock body scroll
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Search logic
  useEffect(() => {
    if (!query.trim() || mode === "ask") {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
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
        console.error("[Search] Error:", err);
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [query, mode]);

  const handleClose = () => {
    setIsOpen(false);
  };

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (mode === "ask") {
      router.push(`/coach?c=${encodeURIComponent(query)}`);
    } else {
      router.push(`/s?q=${encodeURIComponent(query)}`);
    }
    handleClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleClose();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTextareaResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-start justify-center sm:pt-[15vh] p-4 transition-all duration-200 ease-out",
        isOpen
          ? "opacity-100 visible pointer-events-auto"
          : "opacity-0 invisible pointer-events-none"
      )}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "relative w-full max-w-3xl bg-background rounded-xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[80vh] sm:max-h-[70vh] transition-all duration-200 ease-out",
          isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 -translate-y-4"
        )}
      >
        {/* Input Area */}
        <div className="flex items-center gap-3 p-5 border-b border-border/50 bg-muted/30">
          {/* Mode Toggle - Temporarily disabled
          <div className="flex items-center bg-background border border-border rounded-md p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => setMode("search")}
              className={cn(
                "p-2 rounded transition-all duration-200",
                mode === "search"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setMode("ask")}
              className={cn(
                "p-2 rounded transition-all duration-200",
                mode === "ask"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sparkles className="h-4 w-4" />
            </button>
          </div>
          */}
          
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-background border border-input shadow-sm text-muted-foreground flex-shrink-0">
            <Search className="h-5 w-5" />
          </div>

          <div className="flex-1 relative">
            {mode === "ask" ? (
              <textarea
                ref={inputRef as any}
                placeholder="Ask anything about your videos..."
                className="w-full bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 text-lg placeholder:text-muted-foreground resize-none py-2 h-[44px] max-h-[120px] px-3 shadow-sm"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  handleTextareaResize(e);
                }}
                onKeyDown={handleKeyDown}
                rows={1}
              />
            ) : (
              <input
                ref={inputRef as any}
                type="text"
                placeholder="Search videos, transcripts..."
                className="w-full h-10 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 text-lg placeholder:text-muted-foreground px-3 shadow-sm"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-muted text-xs text-muted-foreground font-medium border border-border">
              <span className="text-[10px]">ESC</span>
            </div>
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto min-h-[100px] p-2">
          {mode === "ask" ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground px-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">Ask AI</h3>
              <p className="text-sm max-w-sm mx-auto mb-6">
                Ask questions about your video content and get instant answers based on the transcripts.
              </p>
              {query.trim() && (
                 <button
                 onClick={handleSubmit}
                 className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium text-sm"
               >
                 <span>Ask AI</span>
                 <ArrowRight className="h-4 w-4" />
               </button>
              )}
            </div>
          ) : (
            <>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Searching...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 text-destructive">
                  <p>Error: {error}</p>
                </div>
              ) : query.trim() && results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Search className="h-8 w-8 opacity-20 mb-2" />
                  <p>No results found for &quot;{query}&quot;</p>
                </div>
              ) : !query.trim() ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/60">
                  <Command className="h-12 w-12 opacity-20 mb-4" />
                  <p className="text-sm">Type to search...</p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {results.map((hit, index) => (
                    <div
                      key={`${hit.internal_id}-${index}`}
                      className="group flex flex-col sm:flex-row gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border items-start"
                    >
                      {/* Thumbnail */}
                      <Link
                        href={`/v/${hit.short_id || hit.internal_id}`}
                        onClick={handleClose}
                        className="relative flex-shrink-0 w-full sm:w-48 aspect-video bg-muted rounded-md overflow-hidden border border-border/50"
                      >
                        {hit.thumbnail ? (
                          <Image
                            src={hit.thumbnail}
                            alt={hit.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <Play className="h-8 w-8 text-muted-foreground/50" />
                          </div>
                        )}
                        {hit.duration && (
                          <div className="absolute bottom-1.5 right-1.5 bg-black/70 backdrop-blur-[2px] text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                            {formatTime(hit.duration)}
                          </div>
                        )}
                      </Link>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/v/${hit.short_id || hit.internal_id}`}
                          onClick={handleClose}
                          className="block"
                        >
                          <h3 className="font-semibold text-base leading-tight mb-1 group-hover:text-primary transition-colors line-clamp-1">
                            {hit.title || "Untitled"}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                            <span>Video</span>
                            {hit.published_at && (
                                <>
                                    <span>•</span>
                                    <span>{new Date(hit.published_at).toLocaleDateString()}</span>
                                </>
                            )}
                          </div>
                        </Link>

                        {/* Segments */}
                        {hit.segments && hit.segments.length > 0 && (
                          <div className="space-y-1">
                            {getVisibleSegments(hit).map((segment, idx) => (
                              <Link
                                key={`${hit.internal_id}-segment-${idx}`}
                                href={`/v/${
                                  hit.short_id || hit.internal_id
                                }?t=${Math.floor(segment.start_time)}`}
                                onClick={handleClose}
                                className="flex items-start gap-2 p-1.5 rounded hover:bg-muted transition-colors group/segment"
                              >
                                <div className="flex-shrink-0 mt-0.5">
                                    <div className="flex items-center gap-0.5 bg-primary/10 text-primary text-[10px] font-medium px-1.5 py-0.5 rounded-full group-hover/segment:bg-primary group-hover/segment:text-primary-foreground transition-colors">
                                        <Play size={8} className="fill-current" />
                                        {formatTime(segment.start_time)}
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground group-hover/segment:text-foreground line-clamp-2">
                                  {parseHighlightedText(
                                    segment.highlighted_text || segment.text
                                  )}
                                </p>
                              </Link>
                            ))}

                            {hit.segments.length > 2 && (
                              <button
                                onClick={() => toggleExpand(hit.internal_id)}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mt-1 ml-1"
                              >
                                {expandedVideos[hit.internal_id] ? (
                                  <>
                                    <ChevronUp size={12} />
                                    Show less
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown size={12} />
                                    Show {hit.segments.length - 2} more matches
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {results.length > 0 && (
                    <Link
                        href={`/s?q=${encodeURIComponent(query)}`}
                        onClick={handleClose}
                        className="flex items-center justify-center gap-2 w-full py-3 mt-2 text-sm font-medium text-primary hover:bg-muted rounded-lg transition-colors"
                    >
                        See all results for &quot;{query}&quot;
                        <ArrowRight size={16} />
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-3 border-t border-border bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-background border border-border shadow-sm font-sans">↵</kbd>
                    <span>to select</span>
                </div>
                <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-background border border-border shadow-sm font-sans">esc</kbd>
                    <span>to close</span>
                </div>
            </div>
            <div>
               {results.length > 0 && !isLoading && (
                 <span>{results.length} results found</span>
               )}
            </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
