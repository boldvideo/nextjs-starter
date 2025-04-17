import React, { useRef, useEffect, useState, useLayoutEffect } from "react";
import Image from "next/image";
import { X, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAIAssistant, Message } from "./use-ai-assistant";
import { useAIStream } from "./use-ai-stream";

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
  /** Optional additional CSS classes */
  className?: string;
  /** Optional callback for timestamp clicks */
  onTimeClick?: (time: number) => void;
  /** Optional endpoint override */
  endpoint?: string;
}

/**
 * Converts a timestamp string to seconds
 */
const timestampToSeconds = (timestamp: string): number => {
  const parts = timestamp.split(":").map(Number);
  let hours = 0,
    minutes = 0,
    seconds = 0;

  if (parts.length === 3) {
    [hours, minutes, seconds] = parts;
  } else if (parts.length === 2) {
    [minutes, seconds] = parts;
  } else if (parts.length === 1) {
    [seconds] = parts;
  }

  return hours * 3600 + minutes * 60 + seconds;
};

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
  className,
  onTimeClick,
  endpoint,
}: AIAssistantProps) => {
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

  /* ------------------------------------------------------------------ */
  /* Layout helpers                                                     */
  /* ------------------------------------------------------------------ */

  // Sidebar width (user‑resizable)
  const [width, setWidth] = useState<number>(384); // 24rem default (tailwind w‑96)

  // Header height so we can offset the sidebar correctly
  const [headerHeight, setHeaderHeight] = useState<number>(0);

  // Refs --------------------------------------------------------------
  const sidebarRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Breakpoint helper (desktop = md and above) ------------------------
  const [isDesktop, setIsDesktop] = useState<boolean>(true);
  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handle = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsDesktop(e.matches);
    handle(mq);
    mq.addEventListener("change", handle);
    return () => mq.removeEventListener("change", handle as any);
  }, []);

  // Read header height on mount / resize
  useLayoutEffect(() => {
    const measure = () => {
      const header = document.querySelector("header");
      setHeaderHeight(header ? (header as HTMLElement).offsetHeight : 0);
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Maintain body margin only on desktop
  useEffect(() => {
    if (!isDesktop) return;
    if (isOpen) {
      document.body.style.transition = "margin-right 300ms ease-in-out";
      document.body.style.marginRight = `${width}px`;
    } else {
      document.body.style.marginRight = "";
    }
  }, [isOpen, width, isDesktop]);

  const [isDragging, setIsDragging] = useState<boolean>(false);

  /**
   * Drag handler to resize the sidebar width
   */
  const handleDrag = (e: React.MouseEvent<HTMLDivElement>) => {
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
      document.body.style.marginRight = `${newWidth}px`;
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      const delta = startX - upEvent.clientX;
      const finalWidth = Math.min(Math.max(startWidth + delta, 280), 640);
      setWidth(finalWidth); // single state update
      setIsDragging(false);
      // Restore margin transition for future open/close animations
      document.body.style.transition = "margin-right 300ms ease-in-out";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    // Begin dragging: disable transitions
    setIsDragging(true);
    document.body.style.transition = "none";

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  // Focus input when sidebar opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the sidebar is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleTimeClick = (e: React.MouseEvent<HTMLDivElement>) => {
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
    // Scroll behaviour: if near bottom (<= 80px) OR currently streaming, keep pinned.
    const el = scrollContainerRef.current;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 80;
    if (isPending || isNearBottom) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: isPending ? "auto" : "smooth",
      });
    }
  }, [messages, isPending]);

  return (
    <div className={cn("ai-assistant", className)}>
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
            width: isDesktop ? width : "100vw", // mobile full width
            top: 0,
            height: "100vh",
          }}
          className={cn(
            "fixed right-0",
            "bg-background text-foreground",
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
          <div
            style={{ height: headerHeight ? `${headerHeight}px` : "auto" }}
            className="flex justify-between items-center px-4 py-2 border-b border-background-muted"
          >
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
            className="flex-1 overflow-y-auto p-4 no-scrollbar"
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
              <p>
                {userName ? `Hi ${userName}!` : "Hello there!"} I&apos;m {name},
                your AI assistant. How can I help you with this video?
              </p>
            </div>

            {/* Chat messages */}
            {messages.map((message, index) => (
              <div key={index} className="mb-4">
                <div
                  className={cn(
                    "rounded-lg p-3",
                    message.role === "user"
                      ? "bg-background-muted"
                      : "bg-primary text-background ml-4"
                  )}
                  onClick={handleTimeClick}
                >
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert prose-p:my-0 prose-strong:text-inherit prose-headings:text-inherit"
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
          <div className="p-4 bg-background-muted">
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
            <p className="text-xs text-foreground-muted mt-2">
              Mistakes can happen, we&apos;re all human after all. 😉
            </p>
          </div>
        </aside>
      )}
    </div>
  );
};
