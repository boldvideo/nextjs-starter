"use client";

import React, { useRef, useEffect, useState } from "react";
import { ChatMessage } from "@/hooks/use-ask-stream";
import { MessageBubble } from "./message";
import { ClarificationCard } from "./clarification";
import { AnswerCard } from "./answer";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onClarificationSubmit?: (answer: string, conversationId: string) => void;
  isStreaming?: boolean;
  className?: string;
  aiName?: string;
  aiAvatar?: string;
}

export function CoachInterface({
  messages,
  onClarificationSubmit,
  isStreaming = false,
  className,
  aiName = "FounderWell AI",
  aiAvatar = "/placeholder-avatar.png"
}: ChatInterfaceProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollToBottomRef = useRef<HTMLDivElement>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  // Check if content is scrollable and not at bottom
  const checkScrollPosition = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isScrollable = scrollHeight > clientHeight;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollIndicator(isScrollable && !isNearBottom);
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollToBottomRef.current) {
      const container = scrollContainerRef.current;
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        // Only auto-scroll if user is near the bottom
        if (isNearBottom || isStreaming) {
          scrollToBottomRef.current.scrollIntoView({ 
            behavior: isStreaming ? "auto" : "smooth",
            block: "end"
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- checking scroll position
    checkScrollPosition();
  }, [messages, isStreaming]);

  // Handle scroll events
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", checkScrollPosition);
      return () => container.removeEventListener("scroll", checkScrollPosition);
    }
  }, []);

  const scrollToBottom = () => {
    if (scrollToBottomRef.current) {
      scrollToBottomRef.current.scrollIntoView({ 
        behavior: "smooth",
        block: "end"
      });
    }
  };

  return (
    <div className={cn("flex flex-col h-full relative", className)}>
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto w-full"
      >
        <div className="w-full px-4 md:px-6 py-6 md:py-8 space-y-6">
        {messages.map((message) => {
          // Handle clarification messages specially
          if (message.type === "clarification" && message.metadata?.clarificationResponse) {
            return (
              <ClarificationCard
                key={message.id}
                response={message.metadata.clarificationResponse}
                onSubmit={onClarificationSubmit}
                disabled={isStreaming}
                aiName={aiName}
                aiAvatar={aiAvatar}
              />
            );
          }

          // Handle answer messages with citations
          if (message.type === "answer" && message.metadata?.synthesizedResponse) {
            return (
              <AnswerCard
                key={message.id}
                response={message.metadata.synthesizedResponse}
                aiName={aiName}
                aiAvatar={aiAvatar}
              />
            );
          }

          // Regular message bubble
          return (
            <MessageBubble
              key={message.id}
              message={message}
              aiName={aiName}
              aiAvatar={aiAvatar}
              isStreaming={isStreaming && message.type === "loading"}
            />
          );
        })}
        
          <div ref={scrollToBottomRef} />
        </div>
      </div>

      {/* Scroll to bottom indicator */}
      {showScrollIndicator && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={scrollToBottom}
            className={cn(
              "p-2 rounded-full",
              "bg-background/95 backdrop-blur border shadow-lg",
              "hover:bg-accent transition-all duration-200",
              "animate-in fade-in slide-in-from-bottom-2"
            )}
            aria-label="Scroll to bottom"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}