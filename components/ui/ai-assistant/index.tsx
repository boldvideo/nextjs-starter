"use client";
import React, { useRef, useEffect, useState, useLayoutEffect, useCallback } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { X, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAIAssistant } from "./use-ai-assistant";
import { useAIStream } from "./use-ai-stream";
import { timestampToSeconds } from "@/lib/utils/time";
import { useAIAssistantContext } from "./context";
import { TimestampPill } from "@/components/timestamp-pill";
import type { Message, SuggestedAction } from "./types";

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
 * Component to render text with clickable timestamps
 */
const TextWithTimestamps: React.FC<{ children: string }> = ({ children }) => {
  const { onTimeClick } = useAIAssistantContext();
  const timestampRegex =
    /\[(\d{2}:)?(\d{2}:)?(\d{2})(?:-(\d{2}:)?(\d{2}:)?(\d{2}))?\]/g;
  const parts: (string | React.ReactNode)[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  const handleTimestampClick = (seconds: number, endSeconds?: number) => {
    // Call the onTimeClick callback to seek the video
    if (onTimeClick) {
      onTimeClick(seconds);
    }

    // Scroll to video player
    const videoPlayer = document.querySelector('video, [data-video-player]');
    if (videoPlayer) {
      videoPlayer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      // Fallback: scroll to top of page where video usually is
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  while ((match = timestampRegex.exec(children)) !== null) {
    // Add text before timestamp
    if (match.index > lastIndex) {
      parts.push(children.slice(lastIndex, match.index));
    }

    const fullMatch = match[0];
    const hasRange = fullMatch.includes("-");

    if (hasRange) {
      const [startStr, endStr] = fullMatch.slice(1, -1).split("-");
      const startSeconds = timestampToSeconds(startStr);
      const endSeconds = timestampToSeconds(endStr);
      // Reduce by 1 second for better context, but don't go below 0
      const adjustedStart = Math.max(0, startSeconds - 1);

      parts.push(
        <TimestampPill
          key={key++}
          timestamp={fullMatch.slice(1, -1)}
          onClick={() => handleTimestampClick(adjustedStart, endSeconds)}
        />
      );
    } else {
      const timestamp = fullMatch.slice(1, -1);
      const seconds = timestampToSeconds(timestamp);
      // Reduce by 1 second for better context, but don't go below 0
      const adjustedSeconds = Math.max(0, seconds - 1);
      parts.push(
        <TimestampPill
          key={key++}
          timestamp={timestamp}
          onClick={() => handleTimestampClick(adjustedSeconds)}
        />
      );
    }

    lastIndex = match.index + fullMatch.length;
  }

  // Add remaining text
  if (lastIndex < children.length) {
    parts.push(children.slice(lastIndex));
  }

  return <>{parts}</>;
};

/**
 * Process children recursively to find and replace timestamps
 */
const processChildren = (children: React.ReactNode): React.ReactNode => {
  return React.Children.map(children, (child) => {
    if (typeof child === 'string') {
      return <TextWithTimestamps>{child}</TextWithTimestamps>;
    }
    if (React.isValidElement(child)) {
      const childProps = child.props as { children?: React.ReactNode };
      if (childProps.children) {
        return React.cloneElement(child, {
          ...(child.props as object),
          children: processChildren(childProps.children),
        } as any);
      }
    }
    return child;
  });
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

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
        textareaRef.current?.focus();
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

  /** Auto-resize textarea */
  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const maxHeight = 120; // ~5 lines
      const minHeight = 64;  // ~2 lines
      const newHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight));
      textarea.style.height = `${newHeight}px`;
      
      // Show scrollbar only if content exceeds max height
      if (textarea.scrollHeight > maxHeight) {
        textarea.style.overflowY = "auto";
      } else {
        textarea.style.overflowY = "hidden";
      }
    }
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [inputValue, resizeTextarea]);

  // Re-measure on container width change (fixes issue where sidebar animation causes incorrect height calculation)
  useEffect(() => {
    const container = inputContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      resizeTextarea();
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [resizeTextarea]);

  const renderContent = () => (
    <>
      {!isEmbedded && (
        <div className="flex justify-between items-center px-4 h-16 flex-shrink-0 border-b border-background-muted">
          <h2 className="text-xl font-bold">Ask {name}</h2>
          <button
            onClick={toggleOpen}
            className="text-foreground-muted hover:text-foreground"
          >
            <X size={24} />
          </button>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className={cn(
          "flex-1 min-h-0 overflow-y-auto",
          isEmbedded ? "px-4" : ""
        )}
        onClick={handleTimestampInteraction}
      >
        <div className={cn("mb-4", isEmbedded ? "" : "px-4 pt-4")}>
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
          <div
            className={cn(
              isEmbedded
                ? "rounded-lg p-3 bg-muted text-foreground ml-4"
                : ""
            )}
          >
            <p>
              {greeting && greeting.trim() !== ""
                ? greeting
                : `${
                    userName ? `Hi ${userName}!` : "Hello there!"
                  } I'm ${name}, your AI assistant. How can I help you with this video?`}
            </p>
          </div>
        </div>

        {messages.map((message, index) => (
          <div key={index} className="mb-4">
            <div
              className={cn(
                "rounded-lg p-3 prose max-w-none dark:prose-invert prose-p:my-0 prose-strong:text-inherit prose-headings:text-inherit prose-a:text-primary prose-a:no-underline hover:prose-a:underline [&_ul]:marker:text-current [&_ol]:marker:text-current",
                message.role === "user"
                  ? "bg-muted/50 text-foreground border border-border/50"
                  : "bg-muted text-foreground ml-4",
                message.role === "user" && !isEmbedded ? "mr-8" : "",
                message.role !== "user" && !isEmbedded ? "ml-8" : ""
              )}
            >
              {message.content ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p>{processChildren(children)}</p>,
                    li: ({ children }) => <li>{processChildren(children)}</li>,
                    strong: ({ children }) => (
                      <strong>{processChildren(children)}</strong>
                    ),
                    em: ({ children }) => <em>{processChildren(children)}</em>,
                    h1: ({ children }) => <strong className="block my-2">{processChildren(children)}</strong>,
                    h2: ({ children }) => <strong className="block my-2">{processChildren(children)}</strong>,
                    h3: ({ children }) => <strong className="block my-2">{processChildren(children)}</strong>,
                    h4: ({ children }) => <strong className="block my-2">{processChildren(children)}</strong>,
                    h5: ({ children }) => <strong className="block my-2">{processChildren(children)}</strong>,
                    h6: ({ children }) => <strong className="block my-2">{processChildren(children)}</strong>,
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2 hover:opacity-90"
                      >
                        {processChildren(children)}
                      </a>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              ) : !message.suggested_actions ? (
                <div className="flex items-center gap-2">
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="h-1.5 w-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="h-1.5 w-1.5 bg-current rounded-full animate-bounce"></span>
                  </span>
                </div>
              ) : null}
              {message.tool_call && (
                <div className="mt-2 flex items-center gap-2 text-xs text-foreground/60">
                  <div className="flex gap-1">
                    <span className="h-1 w-1 bg-current rounded-full animate-pulse"></span>
                    <span className="h-1 w-1 bg-current rounded-full animate-pulse [animation-delay:0.2s]"></span>
                    <span className="h-1 w-1 bg-current rounded-full animate-pulse [animation-delay:0.4s]"></span>
                  </div>
                  <span>
                    {message.tool_call.name === "web_search" &&
                      "Searching the web..."}
                    {message.tool_call.name === "lookup" &&
                      "Looking up information..."}
                    {!["web_search", "lookup"].includes(
                      message.tool_call.name
                    ) && `Using ${message.tool_call.name}...`}
                  </span>
                </div>
              )}
              {message.suggested_actions &&
                message.suggested_actions.length > 0 && (
                  <>
                    {message.suggested_actions_prompt && (
                      <p className="mt-2 text-sm">
                        {message.suggested_actions_prompt}
                      </p>
                    )}
                    {message.selected_action ? (
                      <div className="mt-2 px-3 py-1 text-sm bg-muted/50 rounded-full inline-block">
                        {message.selected_action}
                      </div>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {message.suggested_actions.map((action) => (
                          <button
                            key={action.id}
                            onClick={() =>
                              handleSubmit(action.value, action.label, true)
                            }
                            className="px-3 py-1 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-full transition-colors cursor-pointer font-medium"
                            disabled={isPending}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
            </div>
          </div>
        ))}
      </div>

      <div
        className={cn(
          isEmbedded
            ? "mt-auto bg-background border-t p-4 shadow-lg"
            : "p-4 bg-background-muted border-t border-background-muted"
        )}
      >
        <div className="relative flex items-end gap-2" ref={inputContainerRef}>
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Ask me something about this video..."
            rows={2}
            className={cn(
              "w-full rounded-2xl py-3 px-4 resize-none overflow-hidden min-h-[64px]",
              "focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm",
              isEmbedded
                ? "bg-muted text-foreground"
                : "bg-background text-foreground"
            )}
          />
          <button
            className={cn(
              "flex-shrink-0 p-3 rounded-full transition-colors mb-1",
              inputValue.trim()
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
            )}
            onClick={() => handleSubmit()}
            disabled={isPending || !inputValue.trim()}
          >
            <Send size={18} />
          </button>
        </div>
        {!isEmbedded && (
          <p className="text-xs text-gray-500 mt-2">
            Note: our AI chat can make mistakes.
          </p>
        )}
      </div>
    </>
  );

  if (isEmbedded) {
    return (
      <div
        className={cn(
          "flex flex-col flex-1 min-h-0 h-full overflow-hidden",
          className
        )}
      >
        {renderContent()}
      </div>
    );
  }

  return (
    <div className={className}>
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
          {isDesktop && (
            <div
              onMouseDown={handleDrag}
              onDoubleClick={() => setWidth(384)}
              className="absolute -left-1 top-1/2 -translate-y-1/2 h-20 w-2 cursor-ew-resize bg-transparent group"
            >
              <span className="block h-full w-1 bg-border group-hover:bg-primary rounded-full mx-auto" />
            </div>
          )}
          {renderContent()}
        </aside>
      )}
    </div>
  );
};
