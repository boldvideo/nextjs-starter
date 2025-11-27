"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AskCitation } from "@/lib/ask";
import { MuxPlayerComponent } from "@/components/players/player-mux";
import { citationToMuxVideo } from "@/lib/citation-helpers";

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
  const video = citationToMuxVideo(citation);

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

        {/* Full video link */}
        <div className="p-4 border-t bg-muted/30">
          <Link 
            href={`/v/${citation.video_id}`}
            className="inline-flex items-center text-sm font-medium text-primary hover:underline"
            target="_blank"
          >
            Watch full video
          </Link>
        </div>
      </div>
    </>
  );
}
