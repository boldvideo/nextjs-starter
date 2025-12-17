"use client";

import { useState, useRef } from "react";
import { Player } from "@/components/players";
import { ExtendedVideo } from "@/types/video-detail";
import { Settings } from "@boldvideo/bold-js";
import { EmbedTabs } from "./embed-tabs";
import { useVideoProgress } from "@/hooks/use-video-progress";

export type EmbedTab = "chat" | "chapters" | "transcript";

interface EmbedContainerProps {
  video: ExtendedVideo;
  settings: Settings | null;
  startTime?: number;
  enhanced: boolean;
  enabledTabs: string[];
  defaultTab?: string;
  progress: boolean;
  preview: boolean;
}

export function EmbedContainer({
  video,
  settings,
  startTime,
  enhanced,
  enabledTabs,
  defaultTab,
  progress,
  preview,
}: EmbedContainerProps) {
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const [activeTab, setActiveTab] = useState<EmbedTab>(
    (defaultTab as EmbedTab) || (enabledTabs[0] as EmbedTab) || "chat"
  );

  // Progress tracking - only enabled when progress=1 URL param is set
  useVideoProgress({
    videoId: video.id,
    duration: video.duration,
    playerRef,
    enabled: progress,
  });

  const handleTimeSelect = (time: number) => {
    if (playerRef.current) {
      playerRef.current.currentTime = time;
      playerRef.current.play();
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-black overflow-hidden relative">
      {/* Preview Badge */}
      {preview && (
        <div className="absolute top-2 left-2 z-50 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">
          Preview
        </div>
      )}

      {/* Video Player */}
      <div className={enhanced ? "h-1/2 min-h-0" : "flex-1"}>
        <Player
          ref={playerRef}
          video={video}
          autoPlay={false}
          startTime={startTime}
          className="w-full h-full object-contain"
        />
      </div>

      {/* Tab Panel */}
      {enhanced && enabledTabs.length > 0 && (
        <div className="h-1/2 min-h-0 flex flex-col">
          <EmbedTabs
            video={video}
            settings={settings}
            enabledTabs={enabledTabs as EmbedTab[]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onTimeSelect={handleTimeSelect}
            playerRef={playerRef}
          />
        </div>
      )}
    </div>
  );
}
