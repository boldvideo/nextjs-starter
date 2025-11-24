"use client";

import { ExtendedVideo } from "@/types/video-detail";
import { Playlist, Settings } from "@boldvideo/bold-js";
import { RefObject } from "react";
import { MobileTab } from "./mobile-content-shell";
import PlaylistTab from "./playlist-tab";
import InfoTab from "./info-tab";
import ChaptersTab from "./chapters-tab";
import ChatTab from "./chat-tab";

interface MobileTabContentProps {
  activeTab: MobileTab;
  video: ExtendedVideo;
  playlist?: Playlist;
  playerRef: RefObject<HTMLVideoElement | null>;
  onChapterClick: (time: number) => void;
  onTimeSelect: (time: number) => void;
  settings: Settings | null;
}

export default function MobileTabContent({
  activeTab,
  video,
  playlist,
  playerRef,
  onChapterClick,
  onTimeSelect,
  settings,
}: MobileTabContentProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0 relative w-full min-h-[300px]">
      {/* Playlist Tab */}
      {activeTab === "playlist" && playlist && (
        <div className="absolute inset-0 overflow-y-auto animate-in fade-in duration-200">
          <PlaylistTab
            playlist={playlist}
            currentVideoId={video.id}
          />
        </div>
      )}

      {/* Info Tab */}
      {activeTab === "info" && (
        <div className="absolute inset-0 overflow-y-auto animate-in fade-in duration-200">
          <InfoTab
            video={video}
            playerRef={playerRef}
            onTimeSelect={onTimeSelect}
          />
        </div>
      )}

      {/* Chapters Tab */}
      {activeTab === "chapters" && (
        <div className="absolute inset-0 overflow-hidden animate-in fade-in duration-200">
          <ChaptersTab
            chaptersWebVTT={video.chapters || ""}
            playbackId={video.playback_id}
            onChapterClick={onChapterClick}
          />
        </div>
      )}

      {/* Chat Tab */}
      {activeTab === "chat" && (
        <div className="absolute inset-0 overflow-hidden animate-in fade-in duration-200 pb-[env(safe-area-inset-bottom)]">
           {/* We need extra padding for chat because it has its own input area at bottom */}
           {/* Actually MobileBottomNav handles the bottom spacing with pb-safe and fixed position */}
           {/* But we need to make sure chat input doesn't get covered by nav */}
           {/* The nav height is around 60px. We should add padding-bottom to ChatTab container */}
           <div className="h-full flex flex-col pb-[60px]"> 
             <ChatTab video={video} settings={settings} />
           </div>
        </div>
      )}
    </div>
  );
}
