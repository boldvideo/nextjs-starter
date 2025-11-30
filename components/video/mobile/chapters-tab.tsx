"use client";

import { ChaptersSidebar } from "../companion/chapters-sidebar";

interface ChaptersTabProps {
  chaptersWebVTT: string;
  playbackId: string;
  onChapterClick: (time: number) => void;
}

export default function ChaptersTab({
  chaptersWebVTT,
  playbackId,
  onChapterClick,
}: ChaptersTabProps) {
  return (
    <div className="h-full flex flex-col pb-[60px]">
      <ChaptersSidebar
        chaptersWebVTT={chaptersWebVTT}
        playbackId={playbackId}
        onChapterClick={onChapterClick}
        className="border-none shadow-none rounded-none h-full max-h-none w-full flex-1"
      />
    </div>
  );
}
