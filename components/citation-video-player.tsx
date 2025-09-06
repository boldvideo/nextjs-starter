"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, X, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

// Import MuxPlayer dynamically to avoid SSR issues
const MuxPlayer = dynamic(
  () => import("@mux/mux-player-react").then((mod) => mod.default),
  { 
    ssr: false,
    loading: () => (
      <div className="aspect-video flex items-center justify-center bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

interface CitationVideoPlayerProps {
  videoId: string;
  playbackId: string; // Now required from the API
  videoTitle?: string;
  startTime: number; // in seconds
  endTime?: number;
  label: string;
  speaker?: string;
  isExpanded: boolean;
  onToggle: () => void;
  transcriptExcerpt?: string;
}

export function CitationVideoPlayer({
  videoId,
  playbackId,
  videoTitle,
  startTime,
  endTime,
  label,
  speaker,
  isExpanded,
  onToggle,
  transcriptExcerpt,
}: CitationVideoPlayerProps) {
  const playerRef = useRef<any>(null);
  const [hasStarted, setHasStarted] = useState(false);

  // Auto-play when expanded and set start time
  useEffect(() => {
    console.log('[CitationVideoPlayer] Effect triggered:', {
      isExpanded,
      hasStarted,
      playbackId,
      startTime,
      videoTitle,
      label,
      playerRef: playerRef.current
    });
    
    if (isExpanded && playerRef.current && !hasStarted) {
      console.log('[CitationVideoPlayer] Attempting to play video at time:', startTime);
      // Set the start time
      playerRef.current.currentTime = startTime;
      // Play the video
      playerRef.current.play().catch((err: any) => {
        console.error("[CitationVideoPlayer] Autoplay failed:", err);
      });
      setHasStarted(true);
    } else if (!isExpanded) {
      setHasStarted(false);
    }
  }, [isExpanded, startTime, hasStarted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="border-l-2 border-primary/20 ml-2 pl-4">
      {/* Toggle Header */}
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between p-3 rounded-md transition-colors text-left",
          isExpanded ? "bg-primary/5" : "hover:bg-accent"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Play size={14} />
            <span className="font-medium">[{label}]</span>
            {videoTitle && <span className="text-muted-foreground">• {videoTitle}</span>}
            <span className="text-muted-foreground">
              • {formatTime(startTime)}{endTime ? ` - ${formatTime(endTime)}` : ""}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <>
              <span className="text-xs text-muted-foreground">Hide video</span>
              <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              <span className="text-xs text-muted-foreground">Watch clip</span>
              <ChevronDown className="h-4 w-4" />
            </>
          )}
        </div>
      </button>

      {/* Expandable Video Player */}
      {isExpanded && (
        <div className={cn(
          "mt-3 rounded-lg overflow-hidden bg-black",
          "animate-in slide-in-from-top-2 duration-300"
        )}>
          <div className="relative aspect-video">
            <MuxPlayer
              ref={playerRef}
              playbackId={playbackId}
              startTime={startTime}
              streamType="on-demand"
              autoPlay={false} // We control this manually
              muted={false}
              style={{ width: "100%", height: "100%" }}
              onTimeUpdate={(e: any) => {
                // Auto-pause at end time if specified
                if (endTime && e.target) {
                  const currentTime = e.target.currentTime;
                  if (currentTime >= endTime) {
                    e.target.pause();
                  }
                }
              }}
            />
            
            {/* Video Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
              {videoTitle && (
                <p className="text-white text-sm font-medium mb-1">{videoTitle}</p>
              )}
              <p className="text-white/70 text-xs">
                Segment: {formatTime(startTime)} - {endTime ? formatTime(endTime) : "end"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}