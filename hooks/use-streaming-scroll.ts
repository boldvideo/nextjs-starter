"use client";

import { useRef, useState, useEffect, useCallback, useLayoutEffect, startTransition } from "react";

interface UseStreamingScrollOptions {
  /** Whether content is currently streaming */
  isStreaming: boolean;
  /** ID of the current streaming message (to detect new messages) */
  streamingMessageId?: string | null;
  /** Threshold in pixels to consider "at bottom" */
  bottomThreshold?: number;
  /** Selector for the streaming message element (relative to scroll container) */
  messageSelector?: string;
}

interface UseStreamingScrollReturn {
  /** Ref to attach to the scroll container */
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  /** Whether user is currently at/near the bottom */
  isAtBottom: boolean;
  /** Whether in follow-live mode */
  isFollowing: boolean;
  /** Jump to the bottom of content and enter follow mode */
  jumpToLive: () => void;
  /** Jump to bottom without entering follow mode */
  jumpToBottom: () => void;
  /** Whether the scroll-to-live button should be visible */
  showScrollButton: boolean;
}

export function useStreamingScroll({
  isStreaming,
  streamingMessageId,
  bottomThreshold = 60,
  messageSelector = "[data-streaming-message]",
}: UseStreamingScrollOptions): UseStreamingScrollReturn {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const lastMessageIdRef = useRef<string | null>(null);
  const hasScrolledToTopRef = useRef(false);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if scroll position is at bottom
  const checkIsAtBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceFromBottom <= bottomThreshold;
  }, [bottomThreshold]);

  // Scroll to bottom of container
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior,
    });
  }, []);

  // Scroll to top of the streaming message
  const scrollToMessageTop = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const message = el.querySelector(messageSelector);
    if (message) {
      const messageTop = (message as HTMLElement).offsetTop;
      el.scrollTo({
        top: Math.max(0, messageTop - 16), // 16px padding from top
        behavior: "smooth",
      });
    }
  }, [messageSelector]);

  // Jump to live (bottom) and enter follow mode
  const jumpToLive = useCallback(() => {
    setIsFollowing(true);
    scrollToBottom("smooth");
  }, [scrollToBottom]);

  // Jump to bottom without follow mode
  const jumpToBottom = useCallback(() => {
    scrollToBottom("smooth");
  }, [scrollToBottom]);

  // Handle new streaming message - scroll to its top once
  useLayoutEffect(() => {
    if (!isStreaming || !streamingMessageId) {
      // Reset when streaming stops
      hasScrolledToTopRef.current = false;
      lastMessageIdRef.current = null;
      return;
    }

    // New message started streaming
    if (streamingMessageId !== lastMessageIdRef.current) {
      lastMessageIdRef.current = streamingMessageId;
      hasScrolledToTopRef.current = false;
      // Use startTransition to avoid cascading render warning
      startTransition(() => {
        setIsFollowing(false);
      });

      // Small delay to let the message element render
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!hasScrolledToTopRef.current) {
            hasScrolledToTopRef.current = true;
            scrollToMessageTop();
          }
        });
      });
    }
  }, [isStreaming, streamingMessageId, scrollToMessageTop]);

  // Follow mode: keep scrolled to bottom while streaming
  useEffect(() => {
    if (!isStreaming || !isFollowing) return;

    const el = scrollContainerRef.current;
    if (!el) return;

    // Throttled scroll-to-bottom during follow mode
    const followInterval = setInterval(() => {
      if (isFollowing && !isUserScrollingRef.current) {
        scrollToBottom("auto");
      }
    }, 100);

    return () => clearInterval(followInterval);
  }, [isStreaming, isFollowing, scrollToBottom]);

  // Track scroll position and detect user scroll gestures
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const atBottom = checkIsAtBottom();
      setIsAtBottom(atBottom);

      // Mark as user scrolling
      isUserScrollingRef.current = true;
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 150);

      // Exit follow mode if user scrolls away from bottom
      if (isFollowing && !atBottom) {
        setIsFollowing(false);
      }

      // Re-enter follow mode if user scrolls back to bottom while streaming
      if (isStreaming && atBottom && !isFollowing) {
        setIsFollowing(true);
      }
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    
    // Initial check - use startTransition to avoid cascading render warning
    startTransition(() => {
      setIsAtBottom(checkIsAtBottom());
    });

    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [checkIsAtBottom, isFollowing, isStreaming]);

  return {
    scrollContainerRef,
    isAtBottom,
    isFollowing,
    jumpToLive,
    jumpToBottom,
    showScrollButton: !isAtBottom,
  };
}
