"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Loader2, Play, Sparkles, AlertCircle, ChevronRight } from "lucide-react";
import { AskResponse, formatAskTime, timeStringToSeconds } from "@/lib/ask";
import { CitationVideoPlayer } from "@/components/citation-video-player";
import { cn } from "@/lib/utils";

interface AskResultProps {
  query?: string;
}

export function AskResult({ query }: AskResultProps) {
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedCitation, setHighlightedCitation] = useState<string | null>(null);
  const [expandedCitations, setExpandedCitations] = useState<Set<string>>(new Set());

  // Toggle citation video expansion
  const toggleCitationExpansion = useCallback((citationLabel: string) => {
    setExpandedCitations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(citationLabel)) {
        newSet.delete(citationLabel);
      } else {
        newSet.add(citationLabel);
      }
      return newSet;
    });
  }, []);

  // Parse the answer text to create clickable citation links - ALWAYS define hooks
  const renderAnswerWithCitations = useCallback((text: string) => {
    // Regular expression to find citation patterns like [S1], [S2], etc.
    const citationPattern = /\[([S]\d+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = citationPattern.exec(text)) !== null) {
      // Add text before citation
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      // Add clickable citation
      const citationLabel = match[1];
      parts.push(
        <button
          key={`citation-${citationLabel}-${match.index}`}
          onClick={() => {
            // Toggle the video expansion for this citation
            toggleCitationExpansion(citationLabel);
            // Scroll to citation after a brief delay to allow expansion
            setTimeout(() => {
              const element = document.getElementById(`citation-${citationLabel}`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 100);
          }}
          className="text-primary hover:text-primary/80 font-medium transition-colors"
        >
          [{citationLabel}]
        </button>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts;
  }, [toggleCitationExpansion]);

  // Helper function to parse both bold text and citations
  const parseBoldAndCitations = useCallback((text: string) => {
    const parts = [];
    let currentIndex = 0;
    
    // Combined regex to find both bold text and citations
    const combinedPattern = /(\*\*(.+?)\*\*|\[([S]\d+)\])/g;
    let match;
    
    while ((match = combinedPattern.exec(text)) !== null) {
      // Add text before the match
      if (match.index > currentIndex) {
        parts.push(text.substring(currentIndex, match.index));
      }
      
      // Check if it's bold text or citation
      if (match[0].startsWith('**')) {
        // Bold text
        parts.push(<strong key={`bold-${match.index}`}>{match[2]}</strong>);
      } else if (match[0].startsWith('[')) {
        // Citation
        const citationLabel = match[3];
        parts.push(
          <button
            key={`citation-${citationLabel}-${match.index}`}
            onClick={() => {
              toggleCitationExpansion(citationLabel);
              setTimeout(() => {
                const element = document.getElementById(`citation-${citationLabel}`);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }, 100);
            }}
            className="text-primary hover:text-primary/80 font-medium transition-colors"
          >
            [{citationLabel}]
          </button>
        );
      }
      
      currentIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(text.substring(currentIndex));
    }
    
    return parts.length > 0 ? parts : text;
  }, [toggleCitationExpansion]);

  // Function to parse markdown-like formatting to React elements
  const parseMarkdown = useCallback((text: string) => {
    // Split by numbered list items
    const lines = text.split('\n');
    const elements = [];
    let currentList = [];
    let inList = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for numbered list items (e.g., "1. ", "2. ")
      const listMatch = line.match(/^(\d+)\.\s+(.+)/);
      if (listMatch) {
        if (!inList) {
          inList = true;
          currentList = [];
        }
        const content = listMatch[2];
        // Parse bold text and citations within the list item
        const parsedContent = parseBoldAndCitations(content);
        currentList.push(
          <li key={`list-${i}`} className="mb-3">
            {parsedContent}
          </li>
        );
      } else {
        // If we were in a list, add it to elements
        if (inList && currentList.length > 0) {
          elements.push(
            <ol key={`ol-${i}`} className="list-decimal list-inside space-y-2 mb-4">
              {currentList}
            </ol>
          );
          currentList = [];
          inList = false;
        }
        
        // Process regular paragraph
        if (line.trim()) {
          const parsedContent = parseBoldAndCitations(line);
          elements.push(
            <p key={`p-${i}`} className="mb-4">
              {parsedContent}
            </p>
          );
        }
      }
    }
    
    // Add any remaining list items
    if (inList && currentList.length > 0) {
      elements.push(
        <ol key="ol-final" className="list-decimal list-inside space-y-2 mb-4">
          {currentList}
        </ol>
      );
    }
    
    return elements;
  }, [parseBoldAndCitations]);

  useEffect(() => {
    if (!query) {
      setResponse(null);
      return;
    }

    const fetchAnswer = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/ask-global", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ q: query }),
        });

        if (!res.ok) {
          throw new Error(`Failed to get answer: ${res.status}`);
        }

        const data = await res.json();
        console.log("[Ask Result] Raw API Response:", data);
        setResponse(data);
      } catch (err) {
        console.error("[Ask Result] Error:", err);
        setError(err instanceof Error ? err.message : "Failed to get answer");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnswer();
  }, [query]);

  if (!query) {
    return (
      <div className="py-12 text-center">
        <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">
          Ask a question about your videos and get an AI-powered answer with citations
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Try asking "What are the best practices for team management?"
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary/60 mb-4" />
        <p className="text-lg text-muted-foreground">Analyzing your videos...</p>
        <p className="text-sm text-muted-foreground mt-2">This may take 10-15 seconds</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
        <p className="text-lg text-destructive font-medium">Error getting answer</p>
        <p className="text-sm text-muted-foreground mt-2">{error}</p>
      </div>
    );
  }

  if (!response || !response.success || !response.answer) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg text-muted-foreground">
          No answer available. Please try rephrasing your question.
        </p>
      </div>
    );
  }

  const { answer, expanded_queries, processing_time_ms } = response;

  return (
    <div className="space-y-6">
      {/* Question */}
      <div className="bg-sidebar p-6 rounded-lg">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 mt-0.5 text-primary flex-shrink-0" />
          <div>
            <p className="text-sm text-muted-foreground mb-1">Your question</p>
            <p className="text-lg font-medium">{query}</p>
          </div>
        </div>
      </div>

      {/* Answer */}
      <div className="bg-background border border-border rounded-lg p-6">
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <div>{answer.text ? parseMarkdown(answer.text) : "No answer text available"}</div>
        </div>

        {/* Citations with Inline Video Players */}
        {answer.citations && answer.citations.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="text-sm font-medium mb-3 text-muted-foreground">Sources</h3>
            <div className="space-y-3">
              {answer.citations.map((citation) => {
                const isExpanded = expandedCitations.has(citation.label);
                return (
                  <div
                    key={citation.label}
                    id={`citation-${citation.label}`}
                    className="rounded-lg overflow-hidden"
                  >
                    <CitationVideoPlayer
                      videoId={citation.video_id}
                      startTime={timeStringToSeconds(citation.start_time)}
                      endTime={citation.end_time ? timeStringToSeconds(citation.end_time) : undefined}
                      label={citation.label}
                      speaker={citation.speaker}
                      isExpanded={isExpanded}
                      onToggle={() => toggleCitationExpansion(citation.label)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Confidence & Processing Info */}
        <div className="mt-6 pt-6 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span>Confidence:</span>
              <span
                className={cn(
                  "font-medium capitalize",
                  answer.confidence === "high" && "text-green-600 dark:text-green-400",
                  answer.confidence === "medium" && "text-yellow-600 dark:text-yellow-400",
                  answer.confidence === "low" && "text-red-600 dark:text-red-400"
                )}
              >
                {answer.confidence}
              </span>
            </span>
            {answer.model_used && (
              <span className="text-xs">Model: {answer.model_used}</span>
            )}
          </div>
          <span className="text-xs">
            Processed in {(processing_time_ms / 1000).toFixed(1)}s
          </span>
        </div>

        {/* Limitations */}
        {answer.limitations && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/50 rounded-md">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> {answer.limitations}
            </p>
          </div>
        )}
      </div>

      {/* Related Questions */}
      {expanded_queries && expanded_queries.length > 0 && (
        <div className="bg-sidebar p-6 rounded-lg">
          <h3 className="text-sm font-medium mb-3 text-muted-foreground">
            Related questions you might ask
          </h3>
          <div className="space-y-2">
            {expanded_queries.map((relatedQuery, idx) => (
              <Link
                key={idx}
                href={`/ask?q=${encodeURIComponent(relatedQuery)}`}
                className="block p-3 rounded-md hover:bg-background transition-colors group"
              >
                <span className="text-sm group-hover:text-primary transition-colors">
                  {relatedQuery}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}