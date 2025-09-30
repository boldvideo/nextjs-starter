"use client";
import React, { useState, useCallback, useRef, useEffect } from "react";
import { Plus } from "lucide-react";
import { useAskStream } from "@/hooks/use-ask-stream";
import { ChatInterface } from "@/components/chat/chat-interface";
import { ChatInput } from "@/components/chat/chat-input";
import { useSettings } from "@/components/providers/settings-provider";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { getPortalConfig } from "@/lib/portal-config";

export default function ChatPage() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get AI settings from provider
  const settings = useSettings();
  const config = getPortalConfig(settings);
  const aiName = config.ai.name;
  const aiAvatar = config.ai.avatar;

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
      // Error is handled internally by the hook
    }
  });

  // Handle initial query from URL params
  const hasInitializedRef = useRef(false);
  
  useEffect(() => {
    const initialQuery = searchParams?.get("q");
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
    [query, isStreaming, isWaitingForClarification, streamQuestion, submitClarification, conversationId, messages.length]
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
    : "Ask a follow-up question...";

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] w-full max-w-4xl mx-auto">
      {/* Header with New Chat button */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h1 className="text-xl font-semibold">Chat with {aiName}</h1>
        <button
          onClick={handleReset}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg",
            "border border-border hover:bg-accent transition-colors",
            "text-sm font-medium"
          )}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </button>
      </div>

      {/* Chat Interface */}
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

      {/* Input Area */}
      <div className="flex-shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full px-6 py-3 md:p-4">
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