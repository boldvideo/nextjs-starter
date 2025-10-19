"use client";

import Image from "next/image";
import { ProgressBar } from "../progress-bar";
import { CompletionIndicator } from "../completion-indicator";
import { useProgress } from "../providers/progress-provider";

interface ThumbnailImageProps {
  video: {
    id: string;
    thumbnail: string;
    title: string;
  };
  sizes?: string;
  className?: string;
  showProgress?: boolean;
  showCompletionIndicator?: boolean;
}

/**
 * Just the thumbnail image with progress overlay - no wrapper divs or styling
 * Can be embedded in custom layouts like playlist sidebars
 */
export function ThumbnailImage({
  video,
  sizes = "100vw",
  className,
  showProgress = true,
  showCompletionIndicator = true,
}: ThumbnailImageProps) {
  const { progressMap } = useProgress();
  
  // Get progress for this video
  const progressRecord = progressMap.get(video.id);
  const progress = progressRecord
    ? {
        percentWatched: progressRecord.percentWatched,
        completed: progressRecord.completed,
      }
    : null;

  return (
    <>
      <Image
        src={video.thumbnail}
        alt={video.title}
        fill
        className={className || "object-cover"}
        sizes={sizes}
      />

      {/* Progress bar overlay */}
      {showProgress && progress && (
        <ProgressBar 
          percentWatched={progress.percentWatched} 
          completed={progress.completed} 
        />
      )}

      {/* Completion indicator */}
      {showCompletionIndicator && progress?.completed && (
        <CompletionIndicator completed={true} />
      )}
    </>
  );
}
