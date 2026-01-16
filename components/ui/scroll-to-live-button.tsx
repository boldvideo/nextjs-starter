"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollToLiveButtonProps {
  /** Whether the button should be visible */
  visible: boolean;
  /** Whether currently streaming */
  isStreaming?: boolean;
  /** Click handler */
  onClick: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * A pill-shaped button that appears when user scrolls away from the bottom
 * of a streaming chat.
 * 
 * - Streaming: "Jump to live" with arrow
 * - Not streaming: just arrow icon
 */
export function ScrollToLiveButton({
  visible,
  isStreaming = false,
  onClick,
  className,
}: ScrollToLiveButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        // Base styles - pill shape
        "flex items-center gap-1.5 rounded-full",
        "text-sm font-medium",
        "shadow-md",
        "transition-all duration-200 ease-out",
        "focus:outline-none focus:ring-2 focus:ring-primary/50",
        "active:scale-[0.98]",
        // Padding: more compact when icon-only
        isStreaming ? "px-3 py-1.5" : "p-2",
        // Visibility animation
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-2 pointer-events-none",
        // Styling
        isStreaming
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "bg-muted text-foreground hover:bg-muted/80 border border-border/50",
        className
      )}
      aria-label={isStreaming ? "Jump to live" : "Scroll to bottom"}
    >
      <ChevronDown className="h-4 w-4" />
      {isStreaming && <span>Jump to live</span>}
    </button>
  );
}
