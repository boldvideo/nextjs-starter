"use client";
import React, { useState, useCallback, useRef, useEffect } from "react";
import { RotateCcw } from "lucide-react";
import Image from "next/image";
import { useAskStream } from "@/hooks/use-ask-stream";
import { CoachInterface } from "@/components/coach";
import { ChatInput } from "@/components/coach";
import { useSettings } from "@/components/providers/settings-provider";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { getPortalConfig } from "@/lib/portal-config";

export default function CoachPage() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get AI settings from provider
  const settings = useSettings();
  const config = getPortalConfig(settings);
  const aiName = config.ai.name;
  const aiAvatar = config.ai.avatar;
  const suggestions = config.homepage.assistantConfig?.suggestions || [];

  // Initialize streaming hook
  const {
    messages,
    isStreaming,
    isWaitingForClarification,
    streamQuestion,
    submitClarification,
    stop,
    reset
  } = useAskStream({
    onComplete: () => {
      // Clear input after successful response
      setQuery("");
    },
    onError: (_error) => {
      // Error is handled internally by the hook
    }
  });

  // Handle initial query from URL params
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    const initialQuery = searchParams?.get("c");
    if (initialQuery && !hasInitializedRef.current && messages.length === 0) {
      hasInitializedRef.current = true;
      streamQuestion(initialQuery);
    }
  }, [searchParams, messages.length, streamQuestion]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmedQuery = query.trim();

      if (!trimmedQuery || isStreaming) return;

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
    [query, isStreaming, isWaitingForClarification, streamQuestion, submitClarification]
  );

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  const handleReset = useCallback(() => {
    reset();
    setQuery("");
    // Navigate back to homepage on reset
    router.push("/");
  }, [reset, router]);

  const placeholder = isWaitingForClarification
    ? "Type your answer here..."
    : "What's on your mind?";

  const hasMessages = messages.length > 0;
  const greeting = config.ai.greeting || "How can I help you today?";

  // Empty state - centered welcome screen
  if (!hasMessages) {
    return (
      <div className="flex h-[calc(100vh-120px)] w-full items-center justify-center px-4 md:px-6">
        <div className="w-full max-w-2xl space-y-8">
          {/* Centered content with avatar, name, greeting */}
          <div className="text-center space-y-4">
            {aiAvatar && (
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full overflow-hidden">
                <Image
                  src={aiAvatar}
                  alt={aiName}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
              {aiName}
            </h1>
            <p className="text-lg text-muted-foreground">
              {greeting}
            </p>
          </div>

          {/* Input */}
          <ChatInput
            value={query}
            onChange={setQuery}
            onSubmit={handleSubmit}
            onStop={handleStop}
            placeholder={placeholder}
            disabled={false}
            isStreaming={isStreaming}
            autoFocus={true}
            suggestions={suggestions}
            showSuggestions={true}
          />
        </div>
      </div>
    );
  }

  // Active chat state - messages with bottom input
  return (
    <div className="flex flex-col h-[calc(100vh-120px)] w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          {aiAvatar && (
            <Image
              src={aiAvatar}
              alt={aiName}
              width={36}
              height={36}
              className="rounded-full"
            />
          )}
          <h1 className="text-lg md:text-xl font-semibold">{aiName}</h1>
        </div>
        <button
          onClick={handleReset}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg",
            "text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
            "text-sm"
          )}
          title="Start new session"
        >
          <RotateCcw className="h-4 w-4" />
          <span className="hidden sm:inline">New Session</span>
        </button>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <CoachInterface
          messages={messages}
          onClarificationSubmit={() => {}} // No longer needed - handled via main input
          isStreaming={isStreaming}
          aiName={aiName}
          aiAvatar={aiAvatar}
          className="h-full"
        />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full px-4 py-3 md:px-6 md:py-4">
          <ChatInput
            value={query}
            onChange={setQuery}
            onSubmit={handleSubmit}
            onStop={handleStop}
            placeholder={placeholder}
            disabled={false}
            isStreaming={isStreaming}
            autoFocus={true}
            suggestions={[]}
            showSuggestions={false}
          />
        </div>
      </div>
    </div>
  );
}