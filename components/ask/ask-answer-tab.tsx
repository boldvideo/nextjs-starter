"use client";

import { useRef, useEffect, useState } from "react";
import { AISearchMessage, sourceToCitation } from "@/hooks/use-ai-search-stream";
import { AskCitation } from "@/lib/ask";
import { ChevronDown, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { AskMessageCard } from "./ask-message-card";
import Image from "next/image";

interface AskAnswerTabProps {
  messages: AISearchMessage[];
  isStreaming: boolean;
  aiName: string;
  aiAvatar?: string;
  onCitationClick: (citation: AskCitation) => void;
}

export function AskAnswerTab({
  messages,
  isStreaming,
  aiName,
  aiAvatar,
  onCitationClick,
}: AskAnswerTabProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollToBottomRef = useRef<HTMLDivElement>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  const checkScrollPosition = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isScrollable = scrollHeight > clientHeight;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollIndicator(isScrollable && !isNearBottom);
  };

  useEffect(() => {
    if (scrollToBottomRef.current) {
      const container = scrollContainerRef.current;
      if (container) {
        const isNearBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        if (isNearBottom || isStreaming) {
          scrollToBottomRef.current.scrollIntoView({
            behavior: isStreaming ? "auto" : "smooth",
            block: "end",
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- checking scroll position
    checkScrollPosition();
  }, [messages, isStreaming]);

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
        block: "end",
      });
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto w-full">
        <div className="w-full max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
          {messages.map((message) => {
            if (message.role === "user") {
              return (
                <div key={message.id} className="flex gap-3 justify-end">
                  <div className="bg-muted rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%]">
                    <p className="text-sm">{message.content}</p>
                  </div>
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              );
            }

            if (message.type === "loading") {
              return (
                <div key={message.id} className="flex gap-3">
                  <div className="flex-shrink-0">
                    {aiAvatar ? (
                      <Image
                        src={aiAvatar}
                        alt={aiName}
                        width={36}
                        height={36}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              );
            }

            if (message.type === "error") {
              return (
                <div key={message.id} className="flex gap-3">
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center">
                    <span className="text-destructive text-sm">!</span>
                  </div>
                  <div className="text-destructive text-sm py-2">
                    {message.content}
                  </div>
                </div>
              );
            }

            const citations = message.sources?.map((s, i) => sourceToCitation(s, i)) || [];

            return (
              <AskMessageCard
                key={message.id}
                content={message.content}
                citations={citations}
                aiName={aiName}
                aiAvatar={aiAvatar}
                onCitationClick={onCitationClick}
                isStreaming={isStreaming && message.id === messages[messages.length - 1]?.id}
              />
            );
          })}

          <div ref={scrollToBottomRef} />
        </div>
      </div>

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
