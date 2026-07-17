"use client";

import { useState, useEffect, ReactNode } from "react";
import Link from "next/link";
import { Info, List, MessageSquare, PlaySquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAIAssistantContext } from "@/components/video/chat/context";
import { HumanLayerBar } from "@/components/humanlayer-bar";
import { Wordmark } from "@/components/wordmark";
import { MobileAskButton } from "@/components/mobile-ask-button";
import { MobileSearchButton } from "@/components/mobile-search-button";

export type VideoTab = "playlist" | "info" | "chapters" | "chat";

const TAB_STORAGE_KEY = "bold-video-tab";

interface VideoDetailLayoutProps {
  player: ReactNode;
  videoMeta: ReactNode;
  playlistPanel?: ReactNode;
  infoPanel: ReactNode;
  mobileInfoPanel?: ReactNode;
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
  mobileInfoPanel,
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
    } catch {}
  }, [activeTab, isHydrated]);

  const tabs = [
    ...(hasPlaylist
      ? [{ id: "playlist" as const, label: "Playlist", icon: PlaySquare }]
      : []),
    { id: "info" as const, label: "Info", icon: Info },
    ...(chaptersPanel
      ? [{ id: "chapters" as const, label: "Chapters", icon: List }]
      : []),
    { id: "chat" as const, label: "Chat", icon: MessageSquare },
  ];

  // A stored selection may point at a tab this video doesn't offer
  // (e.g. "chapters" persisted from an episode that has them).
  const effectiveTab: VideoTab =
    (activeTab === "chapters" && !chaptersPanel) ||
    (activeTab === "playlist" && !hasPlaylist)
      ? "info"
      : activeTab;

  const sidebarPadding = {
    // Left edge locks to the HumanLayer 1280px page frame (same offset as
    // .hl-nav-container at lg), so the video column starts exactly where
    // the site nav content does; a playlist sidebar wins when it's wider.
    "--frame-left": "max(20px, calc((100vw - 1280px) / 2 + 2rem))",
    "--padding-left": leftSidebar
      ? "max(calc(var(--sidebar-left-width, 0px) + 20px), var(--frame-left))"
      : "var(--frame-left)",
    "--padding-right": rightSidebar
      ? "calc(var(--sidebar-right-width, 0px) + 20px)"
      : "20px",
    // Shared column cap: a full-width 16:9 player would leave no room for
    // content on laptops, so the column is capped by what the viewport
    // height affords (~300px reserved below the player). Player AND text
    // use the same cap so they stay aligned as one column. The outer 1280px
    // bound keeps the column inside the HumanLayer page frame on big screens.
    "--video-col-max":
      "min(1280px, max(640px, calc((100dvh - 380px) * 1.7778)))",
  } as React.CSSProperties;

  return (
    <section
      // The whole column scrolls as one document (chrome and player
      // included on mobile; player included on desktop). Only the chat tab
      // locks the viewport, since its input stays pinned.
      className="video-detail flex flex-1 flex-col min-h-0 w-full overflow-y-auto"
      data-active-tab={effectiveTab}
      data-has-playlist={hasPlaylist}
      style={sidebarPadding}
    >
      {/* Mobile: the HumanLayer chrome + a slim portal row scroll with the
          page, exactly like their own site — nothing is pinned up top */}
      <div className="video-detail__chrome lg:hidden">
        <HumanLayerBar measure={false} className="contents" />
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <Link href="/">
            <Wordmark className="text-lg" />
          </Link>
          <div className="flex items-center gap-1">
            <MobileAskButton />
            <MobileSearchButton />
          </div>
        </div>
      </div>

      {/* === PLAYER === Rendered once, CSS handles responsive positioning */}
      <div
        className="video-detail__player-wrapper w-full flex-shrink-0 lg:pl-[var(--padding-left)] lg:pr-[var(--padding-right)] lg:pt-5 transition-[padding]"
      >
        <div className={cn("mx-auto w-full lg:mx-0", className)}>
          {/* Left-aligned to the page frame, not centered — the sidebar
              owns the right side and the column reads as in-frame */}
          <div className="w-full lg:max-w-[var(--video-col-max)] bg-black aspect-video relative overflow-hidden shadow-lg z-20">
            {player}
          </div>
        </div>
      </div>

      {/* === DESKTOP LAYOUT (lg+) === */}
      <div className="video-detail__desktop hidden lg:flex flex-col relative">
        {leftSidebar}

        {/* Content wrapper with sidebar-aware padding */}
        <div className="min-w-0 w-full transition-all flex flex-col pl-[var(--padding-left)] pr-[var(--padding-right)] transition-[padding]">
          <div className={cn("mx-auto w-full lg:mx-0 flex flex-col", className)}>
            {/* Same column cap as the player so text and video stay aligned */}
            <div className="w-full lg:max-w-[var(--video-col-max)]">
              {infoPanel}
            </div>
          </div>
        </div>

        {rightSidebar}
      </div>

      {/* === MOBILE LAYOUT (<lg) === Content tabs flow with the document
          scroll; the chat tab flips to an app shell via the CSS below. */}
      <div className="video-detail__mobile lg:hidden flex flex-col bg-background">
        {/* Video Metadata Header */}
        <div className="video-detail__meta flex-shrink-0 px-4 py-2 border-b border-border bg-background">
          {videoMeta}
        </div>

        {/* Tab Content Container — clears the fixed bottom nav */}
        <div className="video-detail__panels pb-16">
          {/* Playlist Panel */}
          {playlistPanel && (
            <div className="video-detail__panel" data-panel="playlist">
              {playlistPanel}
            </div>
          )}

          {/* Info Panel */}
          <div className="video-detail__panel" data-panel="info">
            {mobileInfoPanel || infoPanel}
          </div>

          {/* Chapters Panel */}
          {chaptersPanel && (
            <div className="video-detail__panel" data-panel="chapters">
              {chaptersPanel}
            </div>
          )}

          {/* Chat Panel */}
          {chatPanel && (
            <div className="video-detail__panel" data-panel="chat">
              <div className="h-full flex flex-col">{chatPanel}</div>
            </div>
          )}
        </div>

        {/* Bottom Nav */}
        <nav className="video-detail__tabs fixed bottom-0 left-0 right-0 z-30 bg-background border-t border-border pb-safe">
          <div className="flex items-center justify-around">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = effectiveTab === tab.id;

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
        /* Mobile: content tabs flow with the document scroll (chrome and
           player scroll away, like humanlayer.com). The chat tab flips the
           section into an app shell: viewport locked, input pinned. */
        @media (max-width: 1023.98px) {
          .video-detail__panel {
            display: none;
          }

          /* Chat is an app shell: lock the page, hide chrome + meta,
             give the chat panel the remaining viewport */
          .video-detail[data-active-tab="chat"] {
            overflow: hidden;
          }
          .video-detail[data-active-tab="chat"] .video-detail__chrome,
          .video-detail[data-active-tab="chat"] .video-detail__meta {
            display: none;
          }
          .video-detail[data-active-tab="chat"] .video-detail__mobile {
            flex: 1 1 0%;
            min-height: 0;
          }
          .video-detail[data-active-tab="chat"] .video-detail__panels {
            flex: 1 1 0%;
            min-height: 0;
            position: relative;
            padding-bottom: 0;
          }
          .video-detail[data-active-tab="chat"]
            .video-detail__panel[data-panel="chat"] {
            display: block;
            position: absolute;
            inset: 0;
            overflow: hidden;
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
        }
      `}</style>
    </section>
  );
}
