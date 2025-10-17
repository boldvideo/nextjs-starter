"use client";

import { cn } from "@/lib/utils";
import { FileText, MessageSquare, Info, List, ListVideo } from "lucide-react";
import { usePlaylist } from "@/components/providers/playlist-provider";

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
  // Access playlist context for playlist toggle button
  const { hasPlaylist, toggle: togglePlaylist } = usePlaylist();

  return (
    <>
      {/* MOBILE: Fixed Bottom Navigation Bar */}
      <nav
        className={cn(
          "lg:hidden fixed bottom-0 inset-x-0 z-40 bg-background border-t border-border",
          className
        )}
      >
        <div className="flex justify-around items-stretch">
          {/* Description/Details Tab - Always visible */}
          <button
            onClick={() => onTabChange("description")}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors relative",
              activeTab === "description"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-pressed={activeTab === "description"}
          >
            <Info size={24} />
            <span className="text-xs font-medium">Details</span>
            {/* Bottom indicator for active tab */}
            {activeTab === "description" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>

          {/* Chapters Tab - Conditional - Mobile only */}
          {hasChapters && (
            <button
              onClick={() => onTabChange("chapters")}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors relative",
                activeTab === "chapters"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={activeTab === "chapters"}
            >
              <List size={24} />
              <span className="text-xs font-medium">Chapters</span>
              {/* Bottom indicator for active tab */}
              {activeTab === "chapters" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          )}

          {/* Transcript Tab - Conditional */}
          {hasTranscript && (
            <button
              onClick={() => onTabChange("transcript")}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors relative",
                activeTab === "transcript"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={activeTab === "transcript"}
            >
              <FileText size={24} />
              <span className="text-xs font-medium">Transcript</span>
              {/* Bottom indicator for active tab */}
              {activeTab === "transcript" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          )}

          {/* Playlist Toggle - Conditional */}
          {hasPlaylist && (
            <button
              onClick={togglePlaylist}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Toggle playlist"
            >
              <ListVideo size={24} />
              <span className="text-xs font-medium">Playlist</span>
            </button>
          )}

          {/* Ask AI Tab - Conditional */}
          {showAI && (
            <button
              onClick={() => onTabChange("ai")}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors relative",
                activeTab === "ai"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={activeTab === "ai"}
            >
              <MessageSquare size={24} />
              <span className="text-xs font-medium">Ask AI</span>
              {/* Bottom indicator for active tab */}
              {activeTab === "ai" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          )}
        </div>
      </nav>

      {/* DESKTOP: Horizontal Scrolling Tabs (unchanged, except "Details" label) */}
      <div className={cn("hidden lg:block w-full", className)}>
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
              <span>Details</span>
            </button>

            {/* Chapters Tab - Desktop hidden (shown in sidebar) */}
            {/* Chapters are always in the sidebar on desktop, no tab needed */}

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
    </>
  );
}
