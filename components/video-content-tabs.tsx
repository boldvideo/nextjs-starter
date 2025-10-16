"use client";

import { cn } from "@/lib/utils";
import { FileText, MessageSquare, Info, List } from "lucide-react";

// Updated tabs: description, chapters, transcript, ai
export type VideoTabId = "description" | "chapters" | "transcript" | "ai";

interface VideoContentTabsProps {
  activeTab: VideoTabId;
  onTabChange: (tab: VideoTabId) => void;
  hasTranscript: boolean;
  hasChapters: boolean;
  showAI: boolean;
  className?: string;
}

export function VideoContentTabs({
  activeTab,
  onTabChange,
  hasTranscript,
  hasChapters,
  showAI,
  className,
}: VideoContentTabsProps) {
  return (
    <div className={cn("w-[calc(100vw-2rem)] md:w-[calc(100vw-7rem)] lg:w-full", className)}>
      <div className="relative">
        {/* Scrollable container */}
        <div className="flex overflow-x-auto gap-2 py-3 pr-6 bg-background scrollbar-none scroll-smooth">
          {/* Description Tab - Always visible */}
          <button
            onClick={() => onTabChange("description")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full transition-colors text-sm font-medium whitespace-nowrap flex-shrink-0",
              activeTab === "description"
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
            aria-pressed={activeTab === "description"}
          >
            <Info size={18} />
            <span>Description</span>
          </button>

          {/* Chapters Tab - Conditional - Mobile only */}
          {hasChapters && (
            <button
              onClick={() => onTabChange("chapters")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full transition-colors text-sm font-medium whitespace-nowrap flex-shrink-0 lg:hidden",
                activeTab === "chapters"
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              aria-pressed={activeTab === "chapters"}
            >
              <List size={18} />
              <span>Chapters</span>
            </button>
          )}

          {/* Transcript Tab - Conditional */}
          {hasTranscript && (
            <button
              onClick={() => onTabChange("transcript")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full transition-colors text-sm font-medium whitespace-nowrap flex-shrink-0",
                activeTab === "transcript"
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              aria-pressed={activeTab === "transcript"}
            >
              <FileText size={18} />
              <span>Transcript</span>
            </button>
          )}

          {/* Ask AI Tab - Conditional */}
          {showAI && (
            <button
              onClick={() => onTabChange("ai")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full transition-colors text-sm font-medium whitespace-nowrap flex-shrink-0",
                activeTab === "ai"
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              aria-pressed={activeTab === "ai"}
            >
              <MessageSquare size={18} />
              <span>Ask AI</span>
            </button>
          )}
        </div>
        
        {/* Fade indicator on the right */}
        <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
