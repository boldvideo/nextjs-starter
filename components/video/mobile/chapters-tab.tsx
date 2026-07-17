"use client";

import { ChaptersSidebar } from "../companion/chapters-sidebar";

interface ChaptersTabProps {
  chaptersWebVTT: string;
  playbackId: string;
  onChapterClick: (time: number) => void;
  compact?: boolean;
}

export default function ChaptersTab({
  chaptersWebVTT,
  playbackId,
  onChapterClick,
  compact = false,
}: ChaptersTabProps) {
  return (
    <div className="h-full flex flex-col">
      <ChaptersSidebar
        chaptersWebVTT={chaptersWebVTT}
        playbackId={playbackId}
        onChapterClick={onChapterClick}
        compact={compact}
        className="border-none shadow-none rounded-none h-full max-h-none w-full flex-1"
      />
    </div>
  );
}
