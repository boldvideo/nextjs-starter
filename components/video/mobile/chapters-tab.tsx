"use client";

import { ChaptersSidebar } from "../companion/chapters-sidebar";
import { cn } from "@/lib/utils";

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
    <div className={cn("h-full flex flex-col", !compact && "pb-[60px]")}>
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
