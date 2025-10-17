"use client";

import { cn } from "@/lib/utils";

interface VideoLoadingSkeletonProps {
  className?: string;
  hasPlaylist?: boolean;
}

export function VideoLoadingSkeleton({ 
  className, 
  hasPlaylist = false 
}: VideoLoadingSkeletonProps) {
  return (
    <div className={cn("flex min-h-screen", className)}>
      {/* Playlist Sidebar Skeleton */}
      {hasPlaylist && (
        <div className="hidden lg:block w-80 bg-sidebar border-r border-border">
          <div className="p-4 border-b border-border">
            <div className="h-6 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 bg-muted/60 rounded animate-pulse w-24" />
          </div>
          <div className="p-3 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-32 aspect-video bg-muted rounded animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded animate-pulse mb-2" />
                  <div className="h-4 bg-muted/60 rounded animate-pulse w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Video Player Skeleton */}
        <div className="w-full aspect-video bg-black flex items-center justify-center">
          <div className="text-muted-foreground">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-[1500px] mx-auto px-4 md:px-14 mt-6">
          {/* Mobile Playlist Controls Skeleton */}
          {hasPlaylist && (
            <div className="lg:hidden flex items-center justify-between mb-4">
              <div className="w-8 h-8 bg-muted rounded animate-pulse" />
              <div className="flex items-center gap-4">
                <div className="h-4 bg-muted rounded animate-pulse w-16" />
                <div className="w-12 h-6 bg-muted rounded-full animate-pulse" />
              </div>
              <div className="w-8 h-8 bg-muted rounded animate-pulse" />
            </div>
          )}

          {/* Title Skeleton */}
          <div className="mb-2">
            <div className="h-8 bg-muted rounded animate-pulse mb-2" />
            <div className="h-8 bg-muted/60 rounded animate-pulse w-2/3" />
          </div>

          {/* Metadata Skeleton */}
          <div className="flex items-center gap-4 mb-4">
            <div className="h-4 bg-muted rounded animate-pulse w-32" />
          </div>

          {/* Content Area */}
          <div className="flex gap-6">
            {/* Main Content */}
            <div className="flex-[2]">
              {/* Tabs Skeleton */}
              <div className="flex gap-4 mb-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 bg-muted rounded animate-pulse w-24" />
                ))}
              </div>

              {/* Content Skeleton */}
              <div className="space-y-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-4 bg-muted rounded animate-pulse" />
                ))}
              </div>
            </div>

            {/* Sidebar Skeleton */}
            <div className="hidden lg:block flex-[1]">
              <div className="space-y-3">
                <div className="h-6 bg-muted rounded animate-pulse mb-4" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3 p-3 border rounded">
                    <div className="w-16 aspect-video bg-muted rounded animate-pulse" />
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded animate-pulse mb-2" />
                      <div className="h-3 bg-muted/60 rounded animate-pulse w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
