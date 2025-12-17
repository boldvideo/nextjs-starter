"use client";

import { RefObject } from "react";
import { ExtendedVideo } from "@/types/video-detail";
import { Settings } from "@boldvideo/bold-js";
import { cn } from "@/lib/utils";
import { EmbedTab } from "./embed-container";
import ChatTab from "@/components/video/mobile/chat-tab";
import ChaptersTab from "@/components/video/mobile/chapters-tab";
import { Transcript } from "@/components/transcript";
import { AIAssistantProvider } from "@/components/video/chat/context";

interface EmbedTabsProps {
  video: ExtendedVideo;
  settings: Settings | null;
  enabledTabs: EmbedTab[];
  activeTab: EmbedTab;
  onTabChange: (tab: EmbedTab) => void;
  onTimeSelect: (time: number) => void;
  playerRef: RefObject<HTMLVideoElement | null>;
}

const TAB_LABELS: Record<EmbedTab, string> = {
  chat: "Chat",
  chapters: "Chapters",
  transcript: "Transcript",
};

export function EmbedTabs({
  video,
  settings,
  enabledTabs,
  activeTab,
  onTabChange,
  onTimeSelect,
  playerRef,
}: EmbedTabsProps) {
  // Derive URLs/IDs needed by child components
  // video.chapters is the actual VTT content string (not a URL)
  const chaptersWebVTT = video.chapters || "";
  const transcriptUrl = video.transcript?.json?.url || "";

  return (
    <AIAssistantProvider onTimeClick={onTimeSelect}>
      <div className="flex-1 flex flex-col min-h-0 bg-zinc-900 text-zinc-100 dark">
        {/* Tab Bar */}
        <div className="flex border-b border-border">
          {enabledTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={cn(
                "flex-1 px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto">
          {activeTab === "chat" && (
            <ChatTab video={video} settings={settings} compact />
          )}
          {activeTab === "chapters" && chaptersWebVTT && (
            <ChaptersTab
              chaptersWebVTT={chaptersWebVTT}
              playbackId={video.playback_id}
              onChapterClick={onTimeSelect}
              compact
            />
          )}
          {activeTab === "transcript" && transcriptUrl && (
            <Transcript
              url={transcriptUrl}
              playerRef={playerRef}
              onCueClick={onTimeSelect}
              compact
            />
          )}
        </div>
      </div>
    </AIAssistantProvider>
  );
}
