"use client";

import { useEffect } from "react";
import { X, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AskCitation } from "@/lib/ask";
import { MuxPlayerComponent, MuxPlayerVideoLike } from "@/components/players/player-mux";
import { getCanonicalVideoPath } from "@/lib/video-path";

interface AskVideoPanelProps {
  citation: AskCitation | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AskVideoPanel({ citation, isOpen, onClose }: AskVideoPanelProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !citation) return null;

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startSeconds = citation.startMs / 1000;
  const endSeconds = citation.endMs / 1000;

  const video: MuxPlayerVideoLike = {
    id: citation.videoId,
    playbackId: citation.playbackId,
    title: citation.videoTitle,
  };

  return (
    <>
      {/* Backdrop - only on mobile */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-in fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full w-full md:w-[500px] lg:w-[500px] xl:w-[600px] bg-background z-50",
          "shadow-2xl animate-in slide-in-from-right duration-300",
          "flex flex-col",
          "lg:border-l lg:border-border"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Video Source</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Video Player */}
        <div className="aspect-video bg-black flex-shrink-0">
          <MuxPlayerComponent
            video={video}
            startTime={startSeconds}
            autoPlay={true}
            className="w-full h-full"
            onTimeUpdate={(e: Event) => {
              const target = e.target as HTMLVideoElement | null;
              if (!target) return;
              if (endSeconds > startSeconds && target.currentTime >= endSeconds) {
                target.pause();
              }
            }}
          />
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Video Title */}
          <h2 className="text-xl font-semibold mb-6">
            {citation.videoTitle}
          </h2>

          {/* Transcript Section */}
          {citation.text && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                Transcript at {formatTime(citation.startMs)}
              </h4>
              <blockquote className="border-l-2 border-primary pl-4 text-muted-foreground leading-relaxed italic line-clamp-5">
                &ldquo;{citation.text}&rdquo;
              </blockquote>
            </div>
          )}

          {/* Open Full Video Button */}
          <Link
            href={`${getCanonicalVideoPath(citation.videoId)}?t=${Math.floor(citation.startMs / 1000)}`}
            className="mt-8 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-sm font-medium"
          >
            <ExternalLink className="h-4 w-4" />
            Open Full Video
          </Link>
        </div>
      </div>
    </>
  );
}
