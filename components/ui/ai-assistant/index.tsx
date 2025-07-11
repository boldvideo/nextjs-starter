"use client";
import React, { useRef, useEffect, useState, useLayoutEffect } from "react";
import Image from "next/image";
import { X, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAIAssistant, Message } from "./use-ai-assistant";
import { useAIStream } from "./use-ai-stream";
import { timestampToSeconds } from "@/lib/utils/time";
import { useAIAssistantContext } from "./context";

/**
 * Props for the AIAssistant component
 */
interface AIAssistantProps {
  /** Unique identifier for the video context */
  videoId: string;
  /** Name of the AI assistant */
  name: string;
  /** URL to the avatar image */
  avatar: string;
  /** Subdomain for multi-tenant setups */
  subdomain: string;
  /** Optional user's name for personalized greeting */
  userName?: string;
  /** Optional AI greeting message */
  greeting?: string;
  /** Optional additional CSS classes */
  className?: string;
  /** Optional endpoint override */
  endpoint?: string;
  /** Whether the assistant should be embedded in the page layout rather than floating */
  isEmbedded?: boolean;
}

/**
 * Processes message content to make timestamps clickable and format text
 */
const processMessageContent = (content: string) => {
  const timestampRegex =
    /\[(\d{2}:)?(\d{2}:)?(\d{2})(?:-(\d{2}:)?(\d{2}:)?(\d{2}))?\]/g;
  let lastIndex = 0;
  const parts = [];
  let match;

  while ((match = timestampRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    const fullMatch = match[0];
    const hasRange = fullMatch.includes("-");

    if (hasRange) {
      const [startStr, endStr] = fullMatch.slice(1, -1).split("-");
      const startSeconds = timestampToSeconds(startStr);
      const endSeconds = timestampToSeconds(endStr);

      parts.push(
        `<button class="cursor-pointer select-none underline decoration-current/50 hover:decoration-current transition-colors" data-time="${startSeconds}" data-end-time="${endSeconds}"><span class="pointer-events-none">${fullMatch}</span></button>`
      );
    } else {
      const timestamp = fullMatch.slice(1, -1);
      const seconds = timestampToSeconds(timestamp);
      parts.push(
        `<button class="cursor-pointer select-none underline decoration-current/50 hover:decoration-current transition-colors" data-time="${seconds}"><span class="pointer-events-none">${fullMatch}</span></button>`
      );
    }

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  const processedContent = parts.join("");

  const finalContent = processedContent
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold">$1</strong>')
    .replace(/__([^_]+)__/g, '<strong class="font-bold">$1</strong>')
    .split("\n")
    .join("<br />");

  return finalContent;
};

/**
 * AI Assistant Component
 *
 * A chat interface that provides AI assistance for video content. Features include:
 * - Automatic theme inheritance through Tailwind CSS
 * - Video timestamp parsing and interaction
 * - Full chat interface with loading states
 * - Responsive sidebar design
 * - Support for both streaming and non-streaming responses
 *
 * @example
 * ```tsx
 * // Basic usage
 * <AIAssistant
 *   videoId="video-123"
 *   onAskQuestion={handleQuestion}
 *   name="AI Helper"
 *   avatar="/ai-avatar.png"
 * />
 *
 * // With streaming
 * <AIAssistant
 *   videoId="video-123"
 *   onAskQuestion={(q, c, appendChunk) => streamingService.ask(q, appendChunk)}
 *   name="AI Helper"
 *   avatar="/ai-avatar.png"
 *   onTimeClick={(time) => videoPlayer.seekTo(time)}
 * />
 * ```
 */
export const AIAssistant = ({
  videoId,
  name,
  avatar,
  subdomain,
  userName,
  greeting,
  className,
  endpoint,
  isEmbedded = false, // Default to floating mode
}: AIAssistantProps) => {
  const { onTimeClick } = useAIAssistantContext();

  const handleAIQuestion = useAIStream({
    videoId,
    subdomain,
    endpoint,
  });

  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    inputValue,
    setInputValue,
    handleSubmit,
    isPending,
    isOpen,
    toggleOpen,
  } = useAIAssistant({
    onAskQuestion: handleAIQuestion,
  });

  // Ensure the assistant is open when embedded
  useEffect(() => {
    if (isEmbedded && !isOpen) {
      // Force open state when embedded
      toggleOpen();
    }
  }, [isEmbedded, isOpen, toggleOpen]);

  /* ------------------------------------------------------------------ */
  /* Layout helpers                                                     */
  /* ------------------------------------------------------------------ */

  // Sidebar width (user‑resizable) - only relevant for floating mode
  const [width, setWidth] = useState<number>(384); // 24rem default (tailwind w‑96)

  // Refs --------------------------------------------------------------
  const sidebarRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Breakpoint helper (desktop = md and above) ------------------------
  const [isDesktop, setIsDesktop] = useState<boolean>(true);
  useLayoutEffect(() => {
    if (isEmbedded) return; // Skip for embedded mode

    const mq = window.matchMedia("(min-width: 768px)");
    const handle = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsDesktop(e.matches);
    handle(mq);
    mq.addEventListener("change", handle);
    return () => mq.removeEventListener("change", handle as any);
  }, [isEmbedded]);

  const [isDragging, setIsDragging] = useState<boolean>(false);

  /**
   * Drag handler to resize the sidebar width (floating mode only)
   */
  const handleDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isEmbedded) return; // Skip for embedded mode

    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarRef.current
      ? sidebarRef.current.offsetWidth
      : width;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX;
      const newWidth = Math.min(Math.max(startWidth + delta, 280), 640); // min 17.5rem, max 40rem

      // Apply instantly via style for snappy feedback
      if (sidebarRef.current) {
        sidebarRef.current.style.width = `${newWidth}px`;
      }
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      const delta = startX - upEvent.clientX;
      const finalWidth = Math.min(Math.max(startWidth + delta, 280), 640);
      setWidth(finalWidth); // single state update
      setIsDragging(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    // Begin dragging: disable transitions
    setIsDragging(true);

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  // Focus input when sidebar opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleTimestampInteraction = (e: React.MouseEvent<HTMLDivElement>) => {
    const button = (e.target as HTMLElement).closest("[data-time]");
    if (button && onTimeClick) {
      e.preventDefault();
      e.stopPropagation();
      const time = Number(button.getAttribute("data-time"));
      onTimeClick(time);
    }
  };

  /** Auto‑scroll chat as it grows */
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const el = scrollContainerRef.current;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 80;
    if (isPending || isNearBottom) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: isPending ? "auto" : "smooth",
      });
    }
  }, [messages, isPending]);

  // For embedded mode, we use a simpler layout without the floating button or sidebar positioning
  if (isEmbedded) {
    return (
      <div
        className={cn(
          isEmbedded
            ? "flex flex-col flex-1 min-h-0 h-full overflow-hidden"
            : "",
          className
        )}
      >
        {/* Messages Area */}
        <div
          ref={scrollContainerRef}
          onClick={handleTimestampInteraction}
          className="flex-1 min-h-0 overflow-y-auto"
        >
          {/* Welcome message */}
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <Image
                src={avatar}
                alt={name}
                width={40}
                height={40}
                className="rounded-full mr-2"
              />
              <strong>{name}</strong>
            </div>
            <div className="rounded-lg p-3 bg-primary text-primary-foreground ml-4">
              <p>
                {greeting && greeting.trim() !== "" 
                  ? greeting 
                  : `${userName ? `Hi ${userName}!` : "Hello there!"} I'm ${name}, your AI assistant. How can I help you with this video?`}
              </p>
            </div>
          </div>

          {/* Chat messages */}
          {messages.map((message, index) => (
            <div key={index} className="mb-4">
              <div
                className={cn(
                  "rounded-lg p-3 prose prose-sm max-w-none prose-p:my-0 prose-strong:text-inherit prose-headings:text-inherit",
                  message.role === "user"
                    ? "bg-muted text-foreground"
                    : "bg-primary text-primary-foreground ml-4"
                )}
              >
                <div
                  className=""
                  dangerouslySetInnerHTML={{
                    __html: message.content
                      ? processMessageContent(message.content)
                      : `<div class="flex items-center gap-2">
                          <span class="flex gap-1">
                            <span class="h-1.5 w-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span class="h-1.5 w-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span class="h-1.5 w-1.5 bg-current rounded-full animate-bounce"></span>
                          </span>
                        </div>`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="py-4 bg-background">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleSubmit();
                }
              }}
              placeholder="Ask me something about this video..."
              className="w-full bg-muted text-foreground rounded-full py-2 px-4 pr-10"
            />
            {inputValue && (
              <button
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-primary hover:text-primary/90"
                onClick={handleSubmit}
                disabled={isPending}
              >
                <Send size={20} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Floating/sidebar mode (original implementation)
  return (
    <div
      className={cn(
        isEmbedded ? "flex flex-col flex-1 min-h-0 h-full overflow-hidden" : "",
        className
      )}
    >
      {/* Trigger Button */}
      <button
        onClick={toggleOpen}
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "flex items-center justify-center",
          "bg-primary/90 text-background",
          "rounded-full p-2 shadow-lg",
          "hover:bg-primary transition-colors duration-200"
        )}
      >
        <Image
          src={avatar}
          alt={`Ask ${name}`}
          width={60}
          height={60}
          className="rounded-full"
        />
        <span className="ml-2 font-bold">Ask {name}</span>
      </button>

      {/* Sidebar Content */}
      {isOpen && (
        <aside
          ref={sidebarRef}
          style={{
            width: isDesktop ? width : "100%",
            height: "100vh",
          }}
          className={cn(
            "fixed right-0 top-0",
            "bg-sidebar text-sidebar-foreground",
            "shadow-lg z-50",
            "flex flex-col",
            !isDragging && "transition-[width] duration-300 ease-in-out"
          )}
        >
          {/* Drag Handle */}
          {isDesktop && (
            <div
              onMouseDown={handleDrag}
              onDoubleClick={() => setWidth(384)}
              className="absolute -left-1 top-1/2 -translate-y-1/2 h-20 w-2 cursor-ew-resize bg-transparent group"
            >
              <span className="block h-full w-1 bg-border group-hover:bg-primary rounded-full mx-auto" />
            </div>
          )}

          {/* Header */}
          <div className="flex justify-between items-center px-4 h-16 flex-shrink-0 border-b border-background-muted">
            <h2 className="text-xl font-bold">Ask {name}</h2>
            <button
              onClick={toggleOpen}
              className="text-foreground-muted hover:text-foreground"
            >
              <X size={24} />
            </button>
          </div>

          {/* Messages Area */}
          <div
            ref={scrollContainerRef}
            className="flex-1 min-h-0 overflow-y-auto"
            onClick={handleTimestampInteraction}
          >
            {/* Welcome message */}

            <div className="mb-4 px-4 pt-4">
              <div className="flex items-center mb-2">
                <Image
                  src={avatar}
                  alt={name}
                  width={40}
                  height={40}
                  className="rounded-full mr-2"
                />
                <strong>{name}</strong>
              </div>
              <p>
                {greeting && greeting.trim() !== "" 
                  ? greeting 
                  : `${userName ? `Hi ${userName}!` : "Hello there!"} I'm ${name}, your AI assistant. How can I help you with this video?`}
              </p>
            </div>

            {/* Chat messages */}
            {messages.map((message, index) => (
              <div key={index} className="mb-4">
                <div
                  className={cn(
                    "rounded-lg p-3 mx-4 prose prose-sm max-w-none dark:prose-invert prose-p:my-0 prose-strong:text-inherit prose-headings:text-inherit",
                    message.role === "user"
                      ? "bg-background mr-8 text-foreground"
                      : "bg-primary text-primary-foreground ml-8"
                  )}
                >
                  <div
                    className=""
                    dangerouslySetInnerHTML={{
                      __html: message.content
                        ? processMessageContent(message.content)
                        : `<div class="flex items-center gap-2">
                            <span class="flex gap-1">
                              <span class="h-1.5 w-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                              <span class="h-1.5 w-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                              <span class="h-1.5 w-1.5 bg-current rounded-full animate-bounce"></span>
                            </span>
                          </div>`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          {/* Input Area */}
          <div className="p-4 bg-background-muted border-t border-background-muted">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleSubmit();
                  }
                }}
                placeholder="Ask me something about this video..."
                className="w-full bg-background text-foreground rounded-full py-2 px-4 pr-10"
              />
              {inputValue && (
                <button
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-primary hover:text-primary/90"
                  onClick={handleSubmit}
                  disabled={isPending}
                >
                  <Send size={20} />
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Note: our AI chat can make mistakes.
            </p>
          </div>
        </aside>
      )}
    </div>
  );
};
