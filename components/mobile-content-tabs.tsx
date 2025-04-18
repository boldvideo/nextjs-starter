"use client";

import React, { useState } from "react";
import { Info, ListOrdered, Search, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

// Define the available tab types
type TabId = "info" | "chapters" | "transcript" | "assistant";

interface MobileContentTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  hasChapters: boolean;
  hasTranscript: boolean;
  className?: string;
}

/**
 * Mobile navigation tabs for video detail page
 * Displays tabs for Info, Chapters, Transcript, and AI Assistant
 */
export function MobileContentTabs({
  activeTab,
  onTabChange,
  hasChapters,
  hasTranscript,
  className,
}: MobileContentTabsProps) {
  return (
    <div className={cn("md:hidden", className)}>
      {/* Tab Pills */}
      <div className="flex justify-around py-2 border-t border-b border-border bg-background sticky top-0 z-10">
        <button
          onClick={() => onTabChange("info")}
          className={cn(
            "flex items-center gap-1 px-3 py-2 rounded-full transition-colors",
            activeTab === "info"
              ? "text-primary bg-primary/10"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-pressed={activeTab === "info"}
        >
          <Info size={20} />
          <span className="text-xs">Info</span>
        </button>

        {hasChapters && (
          <button
            onClick={() => onTabChange("chapters")}
            className={cn(
              "flex items-center gap-1 px-3 py-2 rounded-full transition-colors",
              activeTab === "chapters"
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-pressed={activeTab === "chapters"}
          >
            <ListOrdered size={20} />
            <span className="text-xs">Chapters</span>
          </button>
        )}

        {hasTranscript && (
          <button
            onClick={() => onTabChange("transcript")}
            className={cn(
              "flex items-center gap-1 px-3 py-2 rounded-full transition-colors",
              activeTab === "transcript"
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-pressed={activeTab === "transcript"}
          >
            <Search size={20} />
            <span className="text-xs">Transcript</span>
          </button>
        )}

        <button
          onClick={() => onTabChange("assistant")}
          className={cn(
            "flex items-center gap-1 px-3 py-2 rounded-full transition-colors",
            activeTab === "assistant"
              ? "text-primary bg-primary/10"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-pressed={activeTab === "assistant"}
        >
          <MessageSquare size={20} />
          <span className="text-xs">Ask AI</span>
        </button>
      </div>
    </div>
  );
}
