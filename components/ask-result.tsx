"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Play, Sparkles, AlertCircle, ChevronRight, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  AskResponse, 
  formatAskTime, 
  timeStringToSeconds,
  isClarificationResponse,
  isSynthesizedResponse,
  isErrorResponse,
  ClarificationResponse,
  SynthesizedResponse
} from "@/lib/ask";
import { CitationVideoPlayer } from "@/components/citation-video-player";
import { AskClarification } from "@/components/ask-clarification";
import { useSettings } from "@/components/providers/settings-provider";
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
  const [loadingMessage, setLoadingMessage] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [clarificationCount, setClarificationCount] = useState(0);
  const loadingStartTime = useRef<number | null>(null);
  const messageIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get settings for AI assistant info
  const settings = useSettings() as any;
  const aiName = settings?.ai_name || "AI Assistant";
  const aiAvatar = settings?.ai_avatar || "/placeholder-avatar.png";
  
  // Loading messages that progress through stages
  const loadingMessages = [
    "Searching through your video library...",
    "Reading transcript segments...",
    "Understanding the context...",
    "Analyzing relevant content...",
    "Finding the best insights...",
    "Synthesizing information...",
    "Crafting your personalized answer...",
    "Almost there...",
  ];

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

  // Custom renderer for citations in markdown
  const renderCitation = useCallback((text: string) => {
    // Check if this looks like a citation pattern [S1], [S2], etc.
    const citationMatch = text.match(/^\[([S]\d+)\]$/);
    if (citationMatch) {
      const citationLabel = citationMatch[1];
      return (
        <button
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
    return text;
  }, [toggleCitationExpansion]);

  // Start rotating loading messages
  useEffect(() => {
    if (isLoading) {
      loadingStartTime.current = Date.now();
      setLoadingMessage(0);
      
      // Change message every 2.5 seconds
      messageIntervalRef.current = setInterval(() => {
        setLoadingMessage(prev => (prev + 1) % loadingMessages.length);
      }, 2500);
    } else {
      if (messageIntervalRef.current) {
        clearInterval(messageIntervalRef.current);
        messageIntervalRef.current = null;
      }
      loadingStartTime.current = null;
    }
    
    return () => {
      if (messageIntervalRef.current) {
        clearInterval(messageIntervalRef.current);
      }
    };
  }, [isLoading, loadingMessages.length]);

  useEffect(() => {
    if (!query) {
      setResponse(null);
      return;
    }

    // Only fetch on initial mount or when query changes (not conversationId)
    if (conversationId) {
      return; // Skip fetching if we already have a conversation going
    }

    const fetchAnswer = async () => {
      setIsLoading(true);
      setError(null);

      // Simple timeout - 45 seconds
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      try {
        const res = await fetch("/api/ask-global", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ q: query }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`Failed to get answer: ${res.status}`);
        }

        const data = await res.json();
        console.log("[Ask Result] Raw API Response:", data);
        setResponse(data);
        
        // Store conversation ID if present
        if (isClarificationResponse(data) || isSynthesizedResponse(data)) {
          if (data.conversation_id) {
            setConversationId(data.conversation_id);
          }
        }
      } catch (err: any) {
        console.error("[Ask Result] Error:", err);
        
        if (err.name === 'AbortError') {
          setError("This is taking longer than expected. Please try again.");
        } else {
          setError(err instanceof Error ? err.message : "Failed to get answer");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnswer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]); // Intentionally not including conversationId to prevent re-fetching

  // Handle clarification submission
  const handleClarificationSubmit = async (clarification: string, convId: string) => {
    setIsLoading(true);
    setError(null);
    setClarificationCount(prev => prev + 1);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const res = await fetch("/api/ask-global", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          q: clarification,
          conversation_id: convId
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Failed to get answer: ${res.status}`);
      }

      const data = await res.json();
      console.log("[Ask Result] Clarification Response:", data);
      setResponse(data);
      
      // Update conversation ID if needed
      if ((isClarificationResponse(data) || isSynthesizedResponse(data)) && data.conversation_id) {
        setConversationId(data.conversation_id);
      }
    } catch (err: any) {
      console.error("[Ask Result] Clarification Error:", err);
      
      if (err.name === 'AbortError') {
        setError("This is taking longer than expected. Please try again.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to process clarification");
      }
    } finally {
      setIsLoading(false);
    }
  };


  if (!query) {
    return (
      <div className="py-12 text-center">
        <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">
          Ask a question about your videos and get an AI-powered answer with citations
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Try asking &ldquo;What are the best practices for team management?&rdquo;
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-6">
        {/* AI Avatar with thinking animation */}
        <div className="relative">
          <div className="relative w-20 h-20 rounded-full overflow-hidden ring-4 ring-primary/20 animate-pulse">
            <Image
              src={aiAvatar}
              alt={aiName}
              fill
              className="object-cover"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </div>
        
        {/* AI Name */}
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{aiName} is thinking...</p>
          
          {/* Rotating message with fade animation */}
          <div className="h-6 relative">
            <p className="text-lg text-foreground transition-all duration-500 animate-in fade-in">
              {loadingMessages[loadingMessage]}
            </p>
          </div>
          
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-2 h-2 rounded-full bg-primary/30 transition-all duration-500",
                  i <= loadingMessage % 3 && "bg-primary scale-125"
                )}
                style={{
                  animationDelay: `${i * 200}ms`,
                }}
              />
            ))}
          </div>
          
          {/* Time estimate */}
          <p className="text-xs text-muted-foreground mt-2">
            This usually takes 10-20 seconds
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center space-y-4">
        <div className="relative w-20 h-20 mx-auto rounded-full overflow-hidden ring-4 ring-destructive/20">
          <Image
            src={aiAvatar}
            alt={aiName}
            fill
            className="object-cover opacity-50"
          />
        </div>
        <AlertCircle className="w-8 h-8 mx-auto text-destructive" />
        <div className="space-y-2">
          <p className="text-lg font-medium text-destructive">Oops, something went wrong</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">{error}</p>
        </div>
        
        {/* Retry button */}
        <button
          onClick={() => {
            setError(null);
            // Trigger re-fetch by updating a dependency
            window.location.href = `/ask?q=${encodeURIComponent(query || '')}`;
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
        
        {/* Show the original question */}
        {query && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg max-w-md mx-auto">
            <p className="text-xs text-muted-foreground mb-1">Your question:</p>
            <p className="text-sm">{query}</p>
          </div>
        )}
      </div>
    );
  }

  // Handle different response types
  if (response) {
    // Handle clarification response
    if (isClarificationResponse(response)) {
      return (
        <AskClarification
          response={response}
          onSubmit={handleClarificationSubmit}
          isLoading={isLoading}
        />
      );
    }

    // Handle error response
    if (isErrorResponse(response)) {
      return (
        <div className="py-12 text-center space-y-4">
          <AlertCircle className="w-8 h-8 mx-auto text-destructive" />
          <div className="space-y-2">
            <p className="text-lg font-medium text-destructive">Error</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {response.error}
              {response.details && `: ${response.details}`}
            </p>
          </div>
        </div>
      );
    }

    // Handle synthesized response
    if (!isSynthesizedResponse(response)) {
      return (
        <div className="py-12 text-center">
          <p className="text-lg text-muted-foreground">
            No answer available. Please try rephrasing your question.
          </p>
        </div>
      );
    }
  } else {
    return null;
  }

  const { answer, expanded_queries, processing_time_ms } = response as SynthesizedResponse;

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

      {/* Answer with AI Assistant */}
      <div className="bg-background border border-border rounded-lg">
        {/* AI Assistant Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary/20">
            <Image
              src={aiAvatar}
              alt={aiName}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">{aiName}</p>
            <p className="text-xs text-muted-foreground">AI Assistant</p>
          </div>
          {answer.confidence && (
            <div className={cn(
              "px-2 py-1 rounded-full text-xs font-medium",
              answer.confidence === "high" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
              answer.confidence === "medium" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
              answer.confidence === "low" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}>
              {answer.confidence} confidence
            </div>
          )}
        </div>
        
        {/* Answer Content */}
        <div className="p-6">
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            {answer.text ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Custom renderer for links/text that might be citations
                  p: ({ children, ...props }) => {
                    // Process children to handle citations
                    const processedChildren = Array.isArray(children) 
                      ? children.map((child, idx) => {
                          if (typeof child === 'string') {
                            // Split by citation pattern and render
                            const parts = child.split(/(\[[S]\d+\])/g);
                            return parts.map((part, partIdx) => {
                              if (part.match(/^\[[S]\d+\]$/)) {
                                return renderCitation(part);
                              }
                              return part;
                            });
                          }
                          return child;
                        })
                      : children;
                    
                    return <p {...props}>{processedChildren}</p>;
                  },
                  li: ({ children, ...props }) => {
                    // Process list items for citations
                    const processedChildren = Array.isArray(children) 
                      ? children.map((child, idx) => {
                          if (typeof child === 'string') {
                            const parts = child.split(/(\[[S]\d+\])/g);
                            return parts.map((part, partIdx) => {
                              if (part.match(/^\[[S]\d+\]$/)) {
                                return renderCitation(part);
                              }
                              return part;
                            });
                          }
                          return child;
                        })
                      : children;
                    
                    return <li {...props}>{processedChildren}</li>;
                  },
                  // Ensure links open in new tab
                  a: ({ ...props }) => (
                    <a
                      {...props}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    />
                  ),
                }}
              >
                {answer.text}
              </ReactMarkdown>
            ) : (
              "No answer text available"
            )}
          </div>
        </div>

          {/* Citations with Inline Video Players */}
          {answer.citations && answer.citations.length > 0 && (
            <div className="px-6 pb-6">
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
                        playbackId={citation.mux_playback_id || ""}
                        videoTitle={citation.video_title}
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

          {/* Processing Info Footer */}
          <div className="px-6 py-3 bg-muted/50 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              {answer.model_used && (
                <span>Powered by {answer.model_used}</span>
              )}
            </div>
            <span>
              Analyzed in {(processing_time_ms / 1000).toFixed(1)}s
            </span>
          </div>
        </div>

      {/* Limitations */}
      {answer.limitations && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/50 rounded-md">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Note:</strong> {answer.limitations}
          </p>
        </div>
      )}

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