"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Playlist, Video } from "@boldvideo/bold-js";
import { X, List, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "util/format-duration";
import { ContinuousPlayToggle } from "./continuous-play-toggle";

interface PlaylistSidebarProps {
  playlist: Playlist;
  currentVideoId: string;
  className?: string;
  onVideoChange?: (video: Video) => void;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
}

export function PlaylistSidebar({
  playlist,
  currentVideoId,
  className,
  onVideoChange,
  isOpen: externalIsOpen,
  onToggle,
}: PlaylistSidebarProps) {
  // Internal state for when no external control
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  // Use external state if provided, otherwise use internal
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = onToggle || setInternalIsOpen;
  const router = useRouter();

  const currentIndex = playlist.videos.findIndex(
    (v) => v.id === currentVideoId
  );

  const handleVideoClick = (video: Video) => {
    setIsOpen(false); // Close mobile drawer
    
    if (onVideoChange) {
      // Use callback for client-side switching
      onVideoChange(video);
    } else {
      // Fallback to navigation for standalone usage
      router.push(`/pl/${playlist.id}/v/${video.id}`);
    }
  };

  return (
    <>


      {/* Backdrop (mobile only) */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - CSS handles desktop vs mobile */}
      <aside
        className={cn(
          // Mobile: fixed drawer from left
          "fixed inset-y-0 left-0 z-50 w-full sm:max-w-sm",
          "bg-sidebar text-sidebar-foreground shadow-lg",
          "transition-transform duration-300 ease-in-out",
          // Mobile transform based on isOpen state
          isOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: override everything with responsive classes  
          "lg:fixed lg:top-18 lg:bottom-0 lg:translate-x-0 lg:w-80 lg:shadow-none",
          "flex flex-col",
          className
        )}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border">
          <div className="flex-1 min-w-0">
            <Link
              href={`/pl/${playlist.id}`}
              className="group flex items-center gap-2 hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 -ml-6 group-hover:ml-0" />
              <h2 className="font-bold text-lg truncate group-hover:translate-x-1 transition-transform duration-200">
                {playlist.title}
              </h2>
            </Link>
            <p className="text-sm text-muted-foreground mt-1">
              {playlist.videos.length} videos
              {currentIndex >= 0 && ` • ${currentIndex + 1} of ${playlist.videos.length}`}
            </p>
          </div>

          {/* Continuous Play Toggle */}
          <ContinuousPlayToggle className="flex-shrink-0 ml-2" />

          {/* Close button - hidden on desktop */}
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden ml-2 p-2 hover:bg-accent rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video List */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <ul className="divide-y divide-border">
            {playlist.videos.map((video, index) => {
              const isCurrent = video.id === currentVideoId;
              return (
                <li key={video.id}>
                  <button
                    onClick={() => handleVideoClick(video)}
                    className={cn(
                      "w-full flex gap-3 p-3 hover:bg-accent transition-colors text-left cursor-pointer",
                      isCurrent && "bg-primary/10 border-l-4 border-l-primary"
                    )}
                  >
                    {/* Thumbnail */}
                    <div className="relative flex-shrink-0 w-32 aspect-video bg-muted rounded overflow-hidden">
                      <Image
                        src={video.thumbnail}
                        alt={video.title}
                        fill
                        className="object-cover"
                        sizes="128px"
                      />
                      <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                        {formatDuration(video.duration)}
                      </div>
                    </div>

                    {/* Video Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <p
                        className={cn(
                          "text-sm font-medium line-clamp-2",
                          isCurrent && "text-primary font-bold"
                        )}
                      >
                        {video.title}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </>
  );
}
