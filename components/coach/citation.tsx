"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { AskCitation } from "@/lib/ask";

// Import MuxPlayer dynamically to avoid SSR issues
const MuxPlayer = dynamic(
  () => import("@mux/mux-player-react").then((mod) => mod.default),
  { ssr: false }
);

interface CitationModalProps {
  citation: AskCitation | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CitationModal({ citation, isOpen, onClose }: CitationModalProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MuxPlayer doesn't export proper ref types
  const playerRef = useRef<any>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  // Set playback time when citation changes
  useEffect(() => {
    if (playerRef.current && citation && isOpen) {
      const startSeconds = citation.start_ms / 1000;
      playerRef.current.currentTime = startSeconds;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MuxPlayer types not exported
      playerRef.current.play().catch((err: any) => {
        console.error("[CitationModal] Autoplay failed:", err);
      });
    }
  }, [citation, isOpen]);

  if (!isOpen || !citation) return null;

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-in fade-in"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={cn(
        "fixed right-0 top-0 h-full w-full md:w-[500px] lg:w-[600px] bg-background z-50",
        "shadow-2xl animate-in slide-in-from-right duration-300"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex-1 mr-4">
            <h3 className="font-semibold text-lg line-clamp-1">
              {citation.video_title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {citation.speaker} • {formatTime(citation.start_ms)} - {formatTime(citation.end_ms)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Video Player */}
        <div className="aspect-video bg-black">
          <MuxPlayer
            ref={playerRef}
            playbackId={citation.playback_id}
            startTime={citation.start_ms / 1000}
            streamType="on-demand"
            autoPlay={false}
            muted={false}
            style={{ width: "100%", height: "100%" }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MuxPlayer event types not exported
            onTimeUpdate={(e: any) => {
              // Auto-pause at end time
              if (e.target) {
                const currentTime = e.target.currentTime;
                const endSeconds = citation.end_ms / 1000;
                if (currentTime >= endSeconds) {
                  e.target.pause();
                }
              }
            }}
          />
        </div>

        {/* Transcript */}
        {citation.transcript_excerpt && (
          <div className="p-4 border-t">
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">
              Transcript Excerpt
            </h4>
            <p className="text-sm leading-relaxed">
              {citation.transcript_excerpt}
            </p>
          </div>
        )}
      </div>
    </>
  );
}