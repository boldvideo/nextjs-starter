"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { Playlist } from "@boldvideo/bold-js";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "util/format-duration";
import { AutoplayToggle } from "./autoplay-toggle";
import { ThumbnailImage } from "@/components/video-thumbnail/thumbnail-image";
import { 
  Sidebar, 
  SidebarHeader, 
  SidebarContent, 
  SidebarToggle 
} from "@/components/ui/sidebar";
import { useSidebar } from "@/components/providers/sidebar-provider";

interface PlaylistSidebarProps {
  playlist: Playlist;
  currentVideoId: string;
  className?: string;
  mode?: "toggle" | "collapse";
  // Legacy props kept for type compatibility but ignored
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
}

export function PlaylistSidebar({
  playlist,
  currentVideoId,
  className,
  mode = "toggle",
}: PlaylistSidebarProps) {
  const { left, setLeftOpen, isMobile } = useSidebar();
  
  // Ensure sidebar is "open" in context for desktop when in collapse mode
  // so width var is calculated correctly
  useEffect(() => {
    if (mode === "collapse" && !isMobile && !left.isOpen) {
      setLeftOpen(true);
    }
  }, [mode, isMobile, left.isOpen, setLeftOpen]);

  const currentIndex = playlist.videos.findIndex(
    (v) => v.id === currentVideoId
  );

  return (
    <Sidebar side="left" mode={mode} className={className}>
      <SidebarHeader>
        {/* Collapsed Mode: Centered Toggle */}
        <div className={cn("flex items-center justify-center w-full", mode !== "collapse" || !left.isCollapsed ? "hidden" : "")}>
           <SidebarToggle side="left" mode="collapse" />
        </div>
           
        {/* Expanded Mode: Content with Absolute Toggle */}
        <div className={cn(
          "flex-1 min-w-0 flex items-center relative pr-8", // Add padding-right for the absolute toggle
          mode === "collapse" && left.isCollapsed && "hidden"
        )}>
            <div className="flex-1 min-w-0 mr-2">
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
                {currentIndex >= 0 &&
                  ` • ${currentIndex + 1} of ${playlist.videos.length}`}
              </p>
            </div>

            <div className="flex items-center">
              <AutoplayToggle className="flex-shrink-0" />
            </div>

            {/* Mobile Close Button (Normal Flow) */}
            <div className="lg:hidden ml-2">
              <SidebarToggle side="left" mode="toggle" />
            </div>
            
            {/* Desktop Collapse Toggle (Absolute "Flap" Position) */}
            <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-50">
                <SidebarToggle side="left" mode={mode} className="hover:bg-accent/50 text-muted-foreground/50 hover:text-foreground" />
            </div>
          </div>
      </SidebarHeader>

      <SidebarContent data-collapsed={mode === "collapse" && left.isCollapsed}>
        {/* Expanded List */}
        <div className={cn(mode === "collapse" && left.isCollapsed && "hidden")}>
          <ul className="divide-y divide-border">
            {playlist.videos.map((video) => {
              const isCurrent = video.id === currentVideoId;

              return (
                <li key={video.id}>
                  <Link
                    href={`/pl/${playlist.id}/v/${video.id}`}
                    className={cn(
                      "w-full flex gap-3 p-3 hover:bg-accent transition-colors text-left cursor-pointer relative",
                      isCurrent && "bg-primary/10 border-l-4 border-l-primary"
                    )}
                  >
                    {/* Thumbnail */}
                    <div className="relative flex-shrink-0 w-32 aspect-video bg-muted rounded overflow-hidden">
                      <ThumbnailImage
                        video={video}
                        sizes="128px"
                        showCompletionIndicator={false}
                      />

                      {/* Duration badge */}
                      <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded z-10">
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
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Collapsed List (Tiny Thumbnails) */}
        {mode === "collapse" && left.isCollapsed && (
          <div className="flex flex-col items-center py-2 gap-2">
            {playlist.videos.map((video) => {
              const isCurrent = video.id === currentVideoId;
              return (
                 <Link
                    key={video.id}
                    href={`/pl/${playlist.id}/v/${video.id}`}
                    className={cn(
                      "relative w-10 h-10 rounded overflow-hidden hover:ring-2 hover:ring-primary transition-all",
                      isCurrent && "ring-2 ring-primary"
                    )}
                    title={video.title}
                  >
                    <ThumbnailImage
                        video={video}
                        sizes="40px"
                        showCompletionIndicator={false}
                        className="object-cover w-full h-full"
                      />
                  </Link>
              );
            })}
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
