"use client";

import { useState, useEffect, ReactNode } from "react";
import { Info, List, MessageSquare, PlaySquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAIAssistantContext } from "@/components/video/chat/context";

export type VideoTab = "playlist" | "info" | "chapters" | "chat";

const TAB_STORAGE_KEY = "bold-video-tab";

interface VideoDetailLayoutProps {
  player: ReactNode;
  videoMeta: ReactNode;
  playlistPanel?: ReactNode;
  infoPanel: ReactNode;
  chaptersPanel?: ReactNode;
  chatPanel?: ReactNode;
  leftSidebar?: ReactNode;
  rightSidebar?: ReactNode;
  hasPlaylist?: boolean;
  className?: string;
}

export function VideoDetailLayout({
  player,
  videoMeta,
  playlistPanel,
  infoPanel,
  chaptersPanel,
  chatPanel,
  leftSidebar,
  rightSidebar,
  hasPlaylist = false,
  className,
}: VideoDetailLayoutProps) {
  const [activeTab, setActiveTab] = useState<VideoTab>(
    hasPlaylist ? "playlist" : "info"
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const { hasUnreadMessage } = useAIAssistantContext();

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(TAB_STORAGE_KEY);
      if (stored && ["playlist", "info", "chapters", "chat"].includes(stored)) {
        if (stored === "playlist" && !hasPlaylist) {
          setActiveTab("info");
        } else {
          setActiveTab(stored as VideoTab);
        }
      }
    } catch (e) {
      console.warn("Failed to hydrate tab state", e);
    } finally {
      setIsHydrated(true);
    }
  }, [hasPlaylist]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(TAB_STORAGE_KEY, activeTab);
    } catch (e) {}
  }, [activeTab, isHydrated]);

  const tabs = [
    ...(hasPlaylist
      ? [{ id: "playlist" as const, label: "Playlist", icon: PlaySquare }]
      : []),
    { id: "info" as const, label: "Info", icon: Info },
    { id: "chapters" as const, label: "Chapters", icon: List },
    { id: "chat" as const, label: "Chat", icon: MessageSquare },
  ];

  const sidebarPadding = {
    "--padding-left": leftSidebar
      ? "calc(var(--sidebar-left-width, 0px) + 20px)"
      : "20px",
    "--padding-right": rightSidebar
      ? "calc(var(--sidebar-right-width, 0px) + 20px)"
      : "20px",
  } as React.CSSProperties;

  return (
    <section
      className="video-detail flex flex-1 flex-col min-h-0 w-full"
      data-active-tab={activeTab}
      data-has-playlist={hasPlaylist}
      style={sidebarPadding}
    >
      {/* === PLAYER === Rendered once, CSS handles responsive positioning */}
      <div
        className="video-detail__player-wrapper w-full flex-shrink-0 lg:pl-[var(--padding-left)] lg:pr-[var(--padding-right)] lg:pt-5 transition-[padding]"
      >
        <div className={cn("mx-auto w-full", className)}>
          <div className="w-full bg-black aspect-video relative overflow-hidden shadow-lg z-20 lg:rounded-lg">
            {player}
          </div>
        </div>
      </div>

      {/* === DESKTOP LAYOUT (lg+) === */}
      <div className="video-detail__desktop hidden lg:flex flex-1 flex-col min-h-0 relative">
        {leftSidebar}

        {/* Content wrapper with sidebar-aware padding */}
        <div className="flex-1 min-w-0 w-full transition-all flex flex-col min-h-0 pl-[var(--padding-left)] pr-[var(--padding-right)] transition-[padding]">
          <div className={cn("mx-auto w-full flex-1 flex flex-col min-h-0", className)}>
            {/* Main Content */}
            {infoPanel}
          </div>
        </div>

        {rightSidebar}
      </div>

      {/* === MOBILE LAYOUT (<lg) === */}
      <div className="video-detail__mobile lg:hidden flex flex-col flex-1 min-h-0 bg-background">
        {/* Video Metadata Header */}
        <div className="video-detail__meta flex-shrink-0 px-4 py-3 border-b border-border bg-background">
          {videoMeta}
        </div>

        {/* Tab Content Container - fills remaining space above bottom nav */}
        <div className="video-detail__panels flex-1 min-h-0 relative pb-16">
          {/* Playlist Panel */}
          {playlistPanel && (
            <div
              className="video-detail__panel absolute inset-0 overflow-y-auto"
              data-panel="playlist"
            >
              {playlistPanel}
            </div>
          )}

          {/* Info Panel */}
          <div
            className="video-detail__panel absolute inset-0 overflow-y-auto px-4"
            data-panel="info"
          >
            {infoPanel}
          </div>

          {/* Chapters Panel */}
          {chaptersPanel && (
            <div
              className="video-detail__panel absolute inset-0 overflow-hidden"
              data-panel="chapters"
            >
              {chaptersPanel}
            </div>
          )}

          {/* Chat Panel */}
          {chatPanel && (
            <div
              className="video-detail__panel absolute inset-0 overflow-hidden"
              data-panel="chat"
            >
              <div className="h-full flex flex-col">{chatPanel}</div>
            </div>
          )}
        </div>

        {/* Bottom Nav */}
        <nav className="video-detail__tabs fixed bottom-0 left-0 right-0 z-30 bg-background border-t border-border pb-safe">
          <div className="flex items-center justify-around">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-2 px-4 min-w-0 flex-1 transition-colors relative",
                    "touch-manipulation",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground active:text-foreground"
                  )}
                  aria-label={tab.label}
                  aria-current={isActive ? "page" : undefined}
                  data-tab={tab.id}
                >
                  {tab.id === "chat" && hasUnreadMessage && !isActive && (
                    <span className="absolute top-2 right-1/3 h-2 w-2 bg-red-500 rounded-full ring-2 ring-background" />
                  )}
                  <Icon className="h-6 w-6 flex-shrink-0" />
                  <span className="text-xs font-medium truncate w-full text-center">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* === CSS for data-attribute-driven panel visibility === */}
      <style jsx>{`
        /* Mobile: Hide all panels by default, show active one */
        @media (max-width: 1023.98px) {
          .video-detail__panel {
            display: none;
          }

          .video-detail[data-active-tab="playlist"]
            .video-detail__panel[data-panel="playlist"] {
            display: block;
          }

          .video-detail[data-active-tab="info"]
            .video-detail__panel[data-panel="info"] {
            display: block;
          }

          .video-detail[data-active-tab="chapters"]
            .video-detail__panel[data-panel="chapters"] {
            display: block;
          }

          .video-detail[data-active-tab="chat"]
            .video-detail__panel[data-panel="chat"] {
            display: block;
          }
        }
      `}</style>
    </section>
  );
}
