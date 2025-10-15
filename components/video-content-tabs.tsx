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
    <div className={cn("w-full", className)}>
      <div className="flex justify-start gap-2 py-3 bg-background">
        {/* Description Tab - Always visible */}
        <button
          onClick={() => onTabChange("description")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full transition-colors text-sm font-medium",
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
              "flex items-center gap-2 px-4 py-2 rounded-full transition-colors text-sm font-medium lg:hidden",
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
              "flex items-center gap-2 px-4 py-2 rounded-full transition-colors text-sm font-medium",
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
              "flex items-center gap-2 px-4 py-2 rounded-full transition-colors text-sm font-medium",
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
    </div>
  );
}
