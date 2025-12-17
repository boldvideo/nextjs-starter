"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Chapter {
  startTime: number;
  endTime: number;
  title: string;
}

interface ChaptersSidebarProps {
  chaptersWebVTT: string;
  playbackId: string;
  onChapterClick: (time: number) => void;
  className?: string;
  /** Compact mode for embeds - hides header */
  compact?: boolean;
}

function timeToSeconds(timeString: string): number {
  const parts = timeString.split(":");
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseFloat(parts[2]);
  return hours * 3600 + minutes * 60 + seconds;
}

function parseWebVTT(vttText: string): Chapter[] {
  const lines = vttText.split("\n");
  const chapters: Chapter[] = [];
  let currentChapter: Partial<Chapter> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Time range line (e.g., "00:00:00.000 --> 00:00:10.000")
    if (line.includes("-->")) {
      const [start, end] = line.split("-->").map((t) => t.trim());
      currentChapter.startTime = timeToSeconds(start);
      currentChapter.endTime = timeToSeconds(end);
    }
    // Title line (non-empty line after time range)
    else if (
      line &&
      !line.startsWith("WEBVTT") &&
      !line.match(/^\d+$/) &&
      currentChapter.startTime !== undefined
    ) {
      currentChapter.title = line;
      chapters.push(currentChapter as Chapter);
      currentChapter = {};
    }
  }

  return chapters;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function ChaptersSidebar({
  chaptersWebVTT,
  onChapterClick,
  className,
  compact = false,
}: ChaptersSidebarProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapter, setActiveChapter] = useState<number>(0);

  useEffect(() => {
    if (chaptersWebVTT) {
      const parsed = parseWebVTT(chaptersWebVTT);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- parsing external data
      setChapters(parsed);
    }
  }, [chaptersWebVTT]);

  return (
    <div
      className={cn(
        "rounded-lg border border-border overflow-hidden flex flex-col h-full",
        compact ? "bg-zinc-900" : "bg-sidebar",
        className
      )}
    >
      {/* Header */}
      {!compact && (
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sidebar-foreground">Chapters</h3>
        </div>
      )}

      {/* Chapter List */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {chapters.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            Loading chapters...
          </div>
        ) : (
          <ol className={cn("divide-y", compact ? "divide-zinc-800" : "divide-border")}>
            {chapters.map((chapter, index) => (
              <li key={index}>
                <button
                  onClick={() => {
                    setActiveChapter(index);
                    onChapterClick(chapter.startTime);
                  }}
                  className={cn(
                    "w-full text-left transition-colors group cursor-pointer flex items-start",
                    compact 
                      ? "px-3 py-1.5 gap-2 text-zinc-100 hover:bg-zinc-800" 
                      : "px-4 py-3 gap-2.5 text-foreground hover:bg-primary/20",
                    activeChapter === index && "bg-primary/10 text-primary"
                  )}
                >
                  <span className={cn(
                    "shrink-0",
                    compact ? "text-[11px] mt-px text-zinc-400" : "text-xs mt-0.5 text-muted-foreground"
                  )}>
                    {formatTime(chapter.startTime)}
                  </span>
                  <div className={cn(
                    "font-medium transition-colors",
                    compact ? "text-xs" : "text-sm"
                  )}>
                    {chapter.title}
                  </div>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
