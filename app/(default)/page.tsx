"use client";
import React, { useState, useCallback, useRef, useEffect } from "react";
import { ArrowUp, Sparkles, Square } from "lucide-react";
import { useAskStream } from "@/hooks/use-ask-stream";
import { ChatInterface } from "@/components/chat/chat-interface";
import { useSettings } from "@/components/providers/settings-provider";
import { cn } from "@/lib/utils";

export default function Home() {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  
  // Get AI settings from provider
  const settings = useSettings() as any;
  const aiName = settings?.ai_name || "FounderWell AI";
  const aiAvatar = settings?.ai_avatar || "/placeholder-avatar.png";

  // Initialize streaming hook
  const {
    messages,
    isStreaming,
    isWaitingForClarification,
    conversationId,
    streamQuestion,
    submitClarification,
    stop,
    reset
  } = useAskStream({
    onComplete: () => {
      // Clear input after successful response
      setQuery("");
    },
    onError: (error) => {
      console.error("Stream error:", error);
    }
  });

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmedQuery = query.trim();
      
      if (!trimmedQuery || isStreaming) return;
      
      // Mark that chat has started
      if (!hasStarted) {
        setHasStarted(true);
      }
      
      // Clear input immediately for better UX
      setQuery("");
      
      // If we're waiting for clarification, submit it as a clarification answer
      if (isWaitingForClarification) {
        submitClarification(trimmedQuery);
      } else {
        // Otherwise, stream as a new question
        await streamQuestion(trimmedQuery);
      }
    },
    [query, isStreaming, hasStarted, isWaitingForClarification, streamQuestion, submitClarification]
  );

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  const handleReset = useCallback(() => {
    reset();
    setHasStarted(false);
    setQuery("");
    // Refocus input after reset
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [reset]);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const placeholder = isWaitingForClarification
    ? "Type your answer here..."
    : hasStarted 
    ? "Ask a follow-up question..." 
    : "Need clarity, connection, or calm? Just ask.";

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] w-full max-w-4xl mx-auto">
      {/* Header - Only show when chat hasn't started */}
      {!hasStarted && (
        <div className="flex-shrink-0 px-6 pt-12 pb-6">
          <div className="w-full text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Get 1,000 hours of coaching in 60 seconds.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              FounderWell&apos;s best advice is distilled from years of calls and is now just one question away.
            </p>
          </div>
        </div>
      )}

      {/* Chat Interface - Shows when chat has started */}
      {hasStarted && (
        <div className="flex-1 overflow-hidden">
          <ChatInterface
            messages={messages}
            onClarificationSubmit={() => {}} // No longer needed - handled via main input
            isStreaming={isStreaming}
            aiName={aiName}
            aiAvatar={aiAvatar}
            className="h-full"
          />
        </div>
      )}

      {/* Input Area - Always visible */}
      <div className="flex-shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full px-6 py-3 md:p-4">
          <form ref={formRef} onSubmit={handleSubmit} className="relative">
            <div
              className={cn(
                "relative flex items-center rounded-2xl border transition-all duration-200",
                isFocused
                  ? "border-primary shadow-lg shadow-primary/10"
                  : "border-border hover:border-primary/50",
                "bg-background"
              )}
            >
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                disabled={isStreaming}
                className={cn(
                  "flex-1 px-6 py-4 text-base bg-transparent outline-none",
                  "placeholder:text-muted-foreground/50 transition-all",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                aria-label="Ask a question"
              />
              
              {/* Submit/Stop button */}
              {isStreaming ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className={cn(
                    "mr-2 p-3 rounded-xl transition-all duration-200",
                    "border border-border bg-background hover:bg-accent",
                    "text-foreground"
                  )}
                  aria-label="Stop generating"
                >
                  <Square className="h-4 w-4 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!query.trim()}
                  className={cn(
                    "mr-2 p-3 rounded-xl transition-all duration-200",
                    query.trim()
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                  aria-label="Submit question"
                >
                  <ArrowUp className="h-5 w-5" />
                </button>
              )}
            </div>
          </form>

          {/* Suggestions - Only show when chat hasn't started */}
          {!hasStarted && (
            <div className="mt-3 flex flex-wrap gap-2 justify-center items-center">
              <span className="text-sm text-muted-foreground">Try:</span>
              {[
                "Navigating burnout & isolation",
                "Managing team stress & culture",
                "Leading with wellbeing under pressure",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setQuery(suggestion);
                    inputRef.current?.focus();
                  }}
                  disabled={isStreaming}
                  className={cn(
                    "text-sm px-3 py-1.5 rounded-lg border transition-colors",
                    "border-border hover:border-primary/50 hover:bg-primary/5",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}