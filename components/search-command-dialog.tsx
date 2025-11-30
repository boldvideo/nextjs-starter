"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Sparkles,
  ArrowRight,
  Command,
  Loader2,
  Play,
  ChevronDown,
  ChevronUp,
  Send,
  Square,
  RotateCcw,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { useSearch } from "@/components/providers/search-provider";
import { useSettings } from "@/components/providers/settings-provider";
import { getPortalConfig } from "@/lib/portal-config";
import { cn } from "@/lib/utils";
import { SearchHit } from "@/lib/search";

interface AISource {
  video_id: string;
  title: string;
  timestamp: number;
  timestamp_end?: number;
  text: string;
  playback_id?: string;
  speaker?: string;
}

interface AIContextMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatTurn {
  id: string;
  query: string;
  response: string;
  sources: AISource[];
  isStreaming?: boolean;
}

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

function renderResponseWithCitations(
  text: string,
  sources: AISource[],
  onSourceClick: (source: AISource) => void
) {
  if (!sources.length) {
    return <span>{text}</span>;
  }

  const citationRegex = /\[(\d+)\]/g;
  const parts = text.split(citationRegex);

  return (
    <>
      {parts.map((part, index) => {
        if (index % 2 === 1) {
          const sourceIndex = parseInt(part, 10) - 1;
          const source = sources[sourceIndex];
          if (source) {
            return (
              <button
                key={index}
                onClick={() => onSourceClick(source)}
                className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 bg-muted hover:bg-muted/80 rounded-full text-[11px] font-medium text-foreground border border-border hover:border-primary/30 transition-colors align-middle cursor-pointer"
              >
                <Play className="h-2.5 w-2.5 fill-current text-primary" />
                <span className="truncate max-w-[100px]">{source.title}</span>
                <span className="text-muted-foreground">{formatTime(source.timestamp)}</span>
              </button>
            );
          }
          return <span key={index}>[{part}]</span>;
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

function ChatMessage({
  turn,
  config,
  onSourceClick,
  isLatest,
}: {
  turn: ChatTurn;
  config: ReturnType<typeof getPortalConfig>;
  onSourceClick: (source: AISource) => void;
  isLatest: boolean;
}) {
  return (
    <div className="space-y-3">
      {/* User message */}
      <div className="flex items-start gap-3 justify-end">
        <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%]">
          <p className="text-sm">{turn.query}</p>
        </div>
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <User className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* AI response */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
          {config.ai.avatar && config.ai.avatar !== '/placeholder-avatar.png' ? (
            <Image
              src={config.ai.avatar}
              alt={config.ai.name}
              width={32}
              height={32}
              className="w-full h-full object-cover"
            />
          ) : (
            <Sparkles className="h-4 w-4 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          {turn.response ? (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-p:leading-relaxed">
              <ReactMarkdown
                components={{
                  p: ({ children }) => {
                    const processChildren = (child: React.ReactNode): React.ReactNode => {
                      if (typeof child === "string") {
                        return renderResponseWithCitations(child, turn.sources, onSourceClick);
                      }
                      return child;
                    };
                    const processed = Array.isArray(children) 
                      ? children.map(processChildren) 
                      : processChildren(children);
                    return <p>{processed}</p>;
                  },
                }}
              >
                {turn.response}
              </ReactMarkdown>
              {turn.isStreaming && isLatest && (
                <span className="inline-block w-2 h-4 bg-primary/50 ml-1 animate-pulse" />
              )}
            </div>
          ) : turn.isStreaming ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function SearchCommandDialog() {
  const router = useRouter();
  const settings = useSettings();
  const config = getPortalConfig(settings);
  const { isOpen, setIsOpen, mode, setMode } = useSearch();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [mounted, setMounted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputElementRef = useRef<HTMLInputElement>(null);
  const [expandedVideos, setExpandedVideos] = useState<Record<string, boolean>>({});

  // Conversation state
  const [conversation, setConversation] = useState<ChatTurn[]>([]);
  const [context, setContext] = useState<AIContextMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const responseAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const clearConversation = useCallback(() => {
    setConversation([]);
    setContext([]);
    setError(undefined);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      clearConversation();
      setQuery("");
    }
  }, [isOpen, clearConversation]);

  useEffect(() => {
    if (mode === "search") {
      clearConversation();
    }
  }, [mode, clearConversation]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (mode === "ask") {
          textareaRef.current?.focus();
        } else {
          inputElementRef.current?.focus();
        }
      }, 50);

      document.body.style.overflow = "hidden";
      return () => clearTimeout(timer);
    } else {
      setQuery("");
      setResults([]);
      document.body.style.removeProperty("overflow");
    }
    return () => {
      document.body.style.removeProperty("overflow");
    };
  }, [isOpen, mode]);

  useEffect(() => {
    if (isStreaming && responseAreaRef.current) {
      responseAreaRef.current.scrollTop = responseAreaRef.current.scrollHeight;
    }
  }, [conversation, isStreaming]);

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
    }, 300);

    return () => clearTimeout(timer);
  }, [query, mode]);

  const handleClose = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsOpen(false);
  }, [setIsOpen]);

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

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      setConversation(prev => 
        prev.map((turn, idx) => 
          idx === prev.length - 1 ? { ...turn, isStreaming: false } : turn
        )
      );
    }
  }, []);

  const handleSourceClick = useCallback((source: AISource) => {
    router.push(`/v/${source.video_id}?t=${Math.floor(source.timestamp)}`);
    handleClose();
  }, [router, handleClose]);

  const streamAISearch = useCallback(async (prompt: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const turnId = `turn-${Date.now()}`;
    const newTurn: ChatTurn = {
      id: turnId,
      query: prompt,
      response: "",
      sources: [],
      isStreaming: true,
    };

    setConversation(prev => [...prev, newTurn]);
    abortControllerRef.current = new AbortController();
    setIsStreaming(true);
    setError(undefined);

    try {
      const response = await fetch("/api/ai-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ 
          prompt, 
          limit: 5,
          context: context.length > 0 ? context : undefined,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedResponse = "";
      let accumulatedSources: AISource[] = [];
      let newContext: AIContextMessage[] = [];

      const processLine = (line: string) => {
        if (!line.startsWith("data: ")) return;

        const dataStr = line.slice(6).trim();
        if (!dataStr || dataStr === "[DONE]") return;

        try {
          const event = JSON.parse(dataStr);

          switch (event.type) {
            case "text_delta":
              accumulatedResponse += event.delta;
              setConversation(prev =>
                prev.map(turn =>
                  turn.id === turnId
                    ? { ...turn, response: accumulatedResponse }
                    : turn
                )
              );
              break;

            case "sources":
              accumulatedSources = event.sources || [];
              setConversation(prev =>
                prev.map(turn =>
                  turn.id === turnId
                    ? { ...turn, sources: accumulatedSources }
                    : turn
                )
              );
              break;

            case "message_complete":
              if (event.sources && event.sources.length > 0) {
                accumulatedSources = event.sources;
              }
              if (event.context) {
                newContext = event.context;
              }
              setConversation(prev =>
                prev.map(turn =>
                  turn.id === turnId
                    ? { 
                        ...turn, 
                        sources: accumulatedSources, 
                        isStreaming: false,
                        response: accumulatedResponse || turn.response,
                      }
                    : turn
                )
              );
              if (newContext.length > 0) {
                setContext(newContext);
              }
              setIsStreaming(false);
              break;

            case "error":
              if (!accumulatedResponse) {
                setError(event.message || "An error occurred");
              }
              break;
          }
        } catch (err) {
          if (process.env.NODE_ENV === "development" && !(err instanceof SyntaxError)) {
            console.warn("[AI Search] Unexpected error parsing SSE:", err);
          }
        }
      };

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          if (buffer.trim()) {
            const remainingLines = buffer.split("\n");
            for (const line of remainingLines) {
              processLine(line);
            }
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          processLine(line);
        }
      }

      reader.releaseLock();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to get response");
      setConversation(prev =>
        prev.map(turn =>
          turn.id === turnId
            ? { ...turn, isStreaming: false }
            : turn
        )
      );
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [context]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (mode === "ask") {
      streamAISearch(query);
      setQuery("");
    } else {
      router.push(`/s?q=${encodeURIComponent(query)}`);
      handleClose();
    }
  };

  const handleStarterClick = (starter: string) => {
    clearConversation();
    streamAISearch(starter);
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

  const hasConversation = conversation.length > 0;

  const [randomStarters, setRandomStarters] = useState<string[]>([]);
  useEffect(() => {
    if (isOpen && mode === "ask" && !hasConversation) {
      const starters = config.ai.conversationStarters;
      if (starters.length <= 4) {
        setRandomStarters(starters);
      } else {
        const shuffled = [...starters];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        setRandomStarters(shuffled.slice(0, 4));
      }
    }
  }, [isOpen, mode, hasConversation, config.ai.conversationStarters]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-start justify-center sm:pt-[8vh] p-4 transition-all duration-200 ease-out",
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
          "relative w-full max-w-3xl bg-background rounded-xl shadow-2xl border border-border overflow-hidden flex flex-col transition-all duration-200 ease-out",
          mode === "ask" ? "h-[640px] max-h-[85vh]" : "max-h-[80vh] sm:max-h-[70vh]",
          isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 -translate-y-4"
        )}
      >
        {mode === "ask" ? (
          /* ========== ASK MODE - Conversational Chat UI ========== */
          <>
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border/50 bg-muted/30 flex-shrink-0">
              {config.ai.showInHeader && (
                <div className="flex items-center bg-background border border-border rounded-md p-0.5 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setMode("search")}
                    className={cn(
                      "p-2 rounded transition-all duration-200",
                      "text-muted-foreground hover:text-foreground"
                    )}
                    title="Search"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("ask")}
                    className={cn(
                      "p-2 rounded transition-all duration-200",
                      "bg-primary/10 text-primary"
                    )}
                    title={`Ask ${config.ai.name}`}
                  >
                    <Sparkles className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                {config.ai.avatar && config.ai.avatar !== '/placeholder-avatar.png' ? (
                  <div className="w-6 h-6 rounded-full overflow-hidden">
                    <Image
                      src={config.ai.avatar}
                      alt={config.ai.name}
                      width={24}
                      height={24}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <Sparkles className="h-5 w-5 text-primary" />
                )}
                <span className="font-semibold text-foreground">{config.ai.name}</span>
              </div>
              
              {/* New Search button - only show when there's conversation */}
              {hasConversation && (
                <button
                  type="button"
                  onClick={clearConversation}
                  className="ml-2 flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-background border border-border rounded-md hover:bg-muted transition-colors"
                  title="Start new conversation"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span className="hidden sm:inline">New chat</span>
                </button>
              )}
              
              <div className="ml-auto">
                <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-muted text-xs text-muted-foreground font-medium border border-border">
                  <span className="text-[10px]">ESC</span>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div 
              ref={responseAreaRef}
              className="flex-1 overflow-y-auto p-6"
            >
              {!hasConversation ? (
                /* Initial state - greeting and starters */
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    {config.ai.greeting}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-8">
                    Choose a prompt or ask a question to get started
                  </p>

                  {randomStarters.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
                      {randomStarters.map((starter, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleStarterClick(starter)}
                          className="flex items-start gap-3 p-3 text-left bg-muted/50 hover:bg-muted text-foreground rounded-lg border border-border hover:border-primary/30 transition-colors"
                        >
                          <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{starter}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Conversation thread */
                <div className="space-y-6">
                  {conversation.map((turn, index) => (
                    <ChatMessage
                      key={turn.id}
                      turn={turn}
                      config={config}
                      onSourceClick={handleSourceClick}
                      isLatest={index === conversation.length - 1}
                    />
                  ))}
                  
                  {error && (
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-destructive" />
                      </div>
                      <div className="text-destructive text-sm py-2">
                        {error}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-border bg-muted/30 flex-shrink-0">
              <form onSubmit={handleSubmit} className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    placeholder={hasConversation ? "Ask a follow-up..." : "Ask a question..."}
                    className="w-full bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/20 text-sm placeholder:text-muted-foreground resize-none py-3 px-4 shadow-sm min-h-[48px] max-h-[120px]"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      handleTextareaResize(e);
                    }}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    disabled={isStreaming}
                  />
                </div>
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={stopStreaming}
                    className="flex items-center justify-center w-12 h-12 bg-muted text-muted-foreground rounded-full hover:bg-muted/80 transition-colors flex-shrink-0 border border-border"
                  >
                    <Square className="h-4 w-4 fill-current" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!query.trim()}
                    className="flex items-center justify-center w-12 h-12 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                )}
              </form>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {hasConversation 
                  ? "Ask follow-up questions to dive deeper" 
                  : "AI responses may be inaccurate. Verify important information."}
              </p>
            </div>
          </>
        ) : (
          /* ========== SEARCH MODE - Original layout ========== */
          <>
            {/* Input Area */}
            <div className="flex items-center gap-3 p-5 border-b border-border/50 bg-muted/30">
              {config.ai.showInHeader ? (
                <div className="flex items-center bg-background border border-border rounded-md p-0.5 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setMode("search")}
                    className={cn(
                      "p-2 rounded transition-all duration-200",
                      "bg-primary/10 text-primary"
                    )}
                    title="Search"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("ask")}
                    className={cn(
                      "p-2 rounded transition-all duration-200",
                      "text-muted-foreground hover:text-foreground"
                    )}
                    title={`Ask ${config.ai.name}`}
                  >
                    <Sparkles className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-background border border-input shadow-sm text-muted-foreground flex-shrink-0">
                  <Search className="h-5 w-5" />
                </div>
              )}

              <div className="flex-1 relative">
                <input
                  ref={inputElementRef}
                  type="text"
                  placeholder="Search videos, transcripts..."
                  className="w-full h-10 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 text-lg placeholder:text-muted-foreground px-3 shadow-sm"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-muted text-xs text-muted-foreground font-medium border border-border">
                  <span className="text-[10px]">ESC</span>
                </div>
              </div>
            </div>

            {/* Results Area */}
            <div className="flex-1 overflow-y-auto min-h-[100px] p-2">
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
                                href={`/v/${hit.short_id || hit.internal_id}?t=${Math.floor(segment.start_time)}`}
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
                                  {parseHighlightedText(segment.highlighted_text || segment.text)}
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
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
