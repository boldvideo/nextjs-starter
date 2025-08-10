"use client";

import { useState, useEffect } from "react";
import { Play, Pause, X, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Player } from "@/components/players";
import { bold } from "@/client";
import { cn } from "@/lib/utils";
import type { Video } from "@boldvideo/bold-js";

interface CitationVideoPlayerProps {
  videoId: string;
  startTime: number; // in seconds
  endTime?: number;
  label: string;
  speaker?: string;
  isExpanded: boolean;
  onToggle: () => void;
}

export function CitationVideoPlayer({
  videoId,
  startTime,
  endTime,
  label,
  speaker,
  isExpanded,
  onToggle,
}: CitationVideoPlayerProps) {
  const [video, setVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Load video data when expanded
  useEffect(() => {
    if (!isExpanded || video) return;

    const loadVideo = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const { data } = await bold.videos.get(videoId);
        if (data) {
          setVideo(data);
        } else {
          setError("Video not found");
        }
      } catch (err) {
        console.error("[Citation Video] Error loading video:", err);
        setError("Failed to load video");
      } finally {
        setIsLoading(false);
      }
    };

    loadVideo();
  }, [isExpanded, videoId, video]);

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
            {speaker && <span className="text-muted-foreground">• Speaker {speaker}</span>}
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
          {isLoading ? (
            <div className="aspect-video flex items-center justify-center bg-muted">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="aspect-video flex items-center justify-center bg-muted">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : video ? (
            <div className="relative">
              <Player
                video={video}
                startTime={startTime}
                autoPlay={true}
                className="w-full aspect-video"
                onTimeUpdate={(e) => {
                  // Auto-pause at end time if specified
                  if (endTime && e.target) {
                    const currentTime = (e.target as HTMLVideoElement).currentTime;
                    if (currentTime >= endTime) {
                      (e.target as HTMLVideoElement).pause();
                    }
                  }
                }}
              />
              
              {/* Video Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                <p className="text-white text-sm font-medium">{video.title || "Untitled Video"}</p>
                <p className="text-white/70 text-xs">
                  Segment: {formatTime(startTime)} - {endTime ? formatTime(endTime) : "end"}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}