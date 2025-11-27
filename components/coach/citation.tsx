"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AskCitation } from "@/lib/ask";
import { MuxPlayerComponent, MuxPlayerVideoLike } from "@/components/players/player-mux";

interface CitationModalProps {
  citation: AskCitation | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CitationModal({ citation, isOpen, onClose }: CitationModalProps) {
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

  if (!isOpen || !citation) return null;

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startSeconds = citation.start_ms / 1000;
  const endSeconds = citation.end_ms / 1000;

  // Transform citation to minimal video object for player (colocated mapper)
  const video: MuxPlayerVideoLike = {
    id: citation.video_id,
    playback_id: citation.playback_id,
    title: citation.video_title,
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
        "shadow-2xl animate-in slide-in-from-right duration-300",
        "flex flex-col"
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
        <div className="aspect-video bg-black flex-shrink-0">
          <MuxPlayerComponent
            video={video}
            startTime={startSeconds}
            autoPlay={true}
            className="w-full h-full"
            onTimeUpdate={(e: Event) => {
              const target = e.target as HTMLVideoElement | null;
              if (!target) return;
              // Auto-pause at end time if defined and greater than start time
              if (endSeconds > startSeconds && target.currentTime >= endSeconds) {
                target.pause();
              }
            }}
          />
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Transcript */}
          {citation.text && (
            <div className="p-6">
              <blockquote className="italic text-muted-foreground leading-relaxed border-l-2 border-primary/20 pl-4">
                "{citation.text}"
              </blockquote>
            </div>
          )}

          {/* Watch full video link */}
          <div className="px-6 pb-6">
            <Link 
              href={`/v/${citation.video_id}?t=${Math.floor(citation.start_ms / 1000)}`}
              className="w-full flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              Watch full video
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
