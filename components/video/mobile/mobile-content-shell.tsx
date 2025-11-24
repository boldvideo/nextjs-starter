"use client";

import { ExtendedVideo } from "@/types/video-detail";
import { Playlist, Settings } from "@boldvideo/bold-js";
import { useState, useEffect, RefObject } from "react";
import MobileBottomNav from "./mobile-bottom-nav";
import MobileTabContent from "./mobile-tab-content";
import { format } from "date-fns";
import { formatDuration } from "@/util/format-duration";

const TAB_STORAGE_KEY = "bold-mobile-bottom-nav-tab";
export type MobileTab = "playlist" | "info" | "chapters" | "chat";

interface MobileContentShellProps {
  video: ExtendedVideo;
  playlist?: Playlist;
  playerRef: RefObject<HTMLVideoElement | null>;
  onChapterClick: (time: number) => void;
  onTimeSelect: (time: number) => void;
  settings: Settings | null;
}

export default function MobileContentShell({
  video,
  playlist,
  playerRef,
  onChapterClick,
  onTimeSelect,
  settings,
}: MobileContentShellProps) {
  // Default to playlist if it exists, otherwise info
  // We initialize lazily to avoid hydration mismatch if possible, 
  // but we need a default. localStorage check happens in effect.
  const [activeTab, setActiveTab] = useState<MobileTab>(
    playlist ? "playlist" : "info"
  );
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate tab state from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(TAB_STORAGE_KEY);
      if (stored && ["playlist", "info", "chapters", "chat"].includes(stored)) {
         // Don't restore 'playlist' tab if current video has no playlist
         if (stored === "playlist" && !playlist) {
           setActiveTab("info");
         } else {
           setActiveTab(stored as MobileTab);
         }
      }
    } catch (e) {
      console.warn("Failed to hydrate mobile tab state", e);
    } finally {
      setIsHydrated(true);
    }
  }, [playlist]);

  // Persist tab state
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(TAB_STORAGE_KEY, activeTab);
    } catch (e) {}
  }, [activeTab, isHydrated]);

  return (
    <div className="flex flex-col flex-1 bg-background pb-16">
      {/* Video Metadata Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-border bg-background">
        <h1 className="text-lg font-semibold line-clamp-2">{video.title}</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
          {video.published_at && (
            <span>{format(new Date(video.published_at), "MMM d, yyyy")}</span>
          )}
          {video.duration && (
            <>
              <span>•</span>
              <span>{formatDuration(video.duration)}</span>
            </>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <MobileTabContent
        activeTab={activeTab}
        video={video}
        playlist={playlist}
        playerRef={playerRef}
        onChapterClick={onChapterClick}
        onTimeSelect={onTimeSelect}
        settings={settings}
      />

      {/* Bottom Nav */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasPlaylist={!!playlist}
      />
    </div>
  );
}
