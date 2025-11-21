"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatRelative } from "date-fns";
import { cn } from "@/lib/utils";
import { Transcript } from "@/components/transcript";
import { AutoplayToggle } from "./autoplay-toggle";
import { VideoDescription } from "./video-description";
import { SidebarToggle } from "@/components/ui/sidebar";
import type { ExtendedVideo } from "@/types/video-detail";
import type { Playlist } from "@boldvideo/bold-js";

interface VideoMainContentProps {
  video: ExtendedVideo;
  playlist?: Playlist;
  currentVideoIndex: number;
  previousVideo?: Playlist["videos"][number] | null;
  nextVideo?: Playlist["videos"][number] | null;
  hasPreviousVideo: boolean;
  hasNextVideo: boolean;
  onTimeSelect: (time: number) => void;
  playerRef: React.RefObject<HTMLVideoElement | null>;
}

export function VideoMainContent({
  video,
  playlist,
  currentVideoIndex,
  previousVideo,
  nextVideo,
  hasPreviousVideo,
  hasNextVideo,
  onTimeSelect,
  playerRef,
}: VideoMainContentProps) {
  const [activeMainTab, setActiveMainTab] = useState<
    "description" | "transcript"
  >("description");

  const hasTranscript =
    !!video.transcript &&
    !!video.transcript.json &&
    !!video.transcript.json.url;

  return (
    <div className="w-full mx-auto flex flex-col">
      <div className="flex flex-col flex-1 mt-6 min-h-[600px] pb-24 lg:pb-8">
        {/* Mobile Playlist Controls */}
        {playlist && (
          <div className="lg:hidden flex items-center justify-between mb-4">
            {/* Previous */}
            <div className="lg:hidden">
              {/* Mobile Toggle */}
              <SidebarToggle side="left" mode="toggle" className="mr-2" />
            </div>

            {hasPreviousVideo && previousVideo ? (
              <Link
                href={`/pl/${playlist.id}/v/${previousVideo.id}`}
                className="p-2 rounded-md transition-colors text-foreground hover:bg-accent"
              >
                <ChevronLeft size={24} />
              </Link>
            ) : (
              <div className="p-2 rounded-md text-muted-foreground/30">
                <ChevronLeft size={24} />
              </div>
            )}

            {/* Counter */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">
                {currentVideoIndex + 1} / {playlist.videos.length}
              </span>
              <AutoplayToggle />
            </div>

            {/* Next */}
            {hasNextVideo && nextVideo ? (
              <Link
                href={`/pl/${playlist.id}/v/${nextVideo.id}`}
                className="p-2 rounded-md transition-colors text-foreground hover:bg-accent"
              >
                <ChevronRight size={24} />
              </Link>
            ) : (
              <div className="p-2 rounded-md text-muted-foreground/30">
                <ChevronRight size={24} />
              </div>
            )}
          </div>
        )}

        {/* Title & Metadata */}
        <div className="mb-2">
          <h1 className="text-2xl lg:text-3xl font-bold line-clamp-2 leading-tight">
            {video.title}
          </h1>
        </div>
        <div className="flex items-center gap-4 text-base text-muted-foreground mb-6">
          <span>
            {video.published_at &&
              formatRelative(new Date(video.published_at), new Date())}
          </span>
        </div>

        {/* Main Tabs Navigation */}
        <div className="flex items-center border-b border-border mb-6">
          <button
            onClick={() => setActiveMainTab("description")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeMainTab === "description"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Description
          </button>
          {hasTranscript && (
            <button
              onClick={() => setActiveMainTab("transcript")}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeMainTab === "transcript"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Transcript
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0">
          {activeMainTab === "description" && (
            <div className="space-y-6">
              <VideoDescription text={video.description || ""} />
              {video.cta && (
                <div className="rounded-lg border border-border p-6 bg-card">
                  <h2 className="text-lg font-bold mb-2">{video.cta.title}</h2>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ ...props }) => (
                        <a
                          {...props}
                          className="text-primary hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      ),
                      p: ({ ...props }) => (
                        <p {...props} className="mb-4 last:mb-0" />
                      ),
                    }}
                  >
                    {video.cta.description}
                  </ReactMarkdown>
                  {video.cta.button_text && video.cta.button_url && (
                    <a
                      className="mt-4 inline-flex bg-foreground text-background rounded-md px-4 py-2 items-center justify-center hover:opacity-90 transition-opacity"
                      href={video.cta.button_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {video.cta.button_text}
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {activeMainTab === "transcript" && hasTranscript && (
            <div className="min-h-[600px] max-h-[calc(100vh-200px)] overflow-y-auto no-scrollbar rounded-md">
              <Transcript
                url={video.transcript?.json?.url || ""}
                onCueClick={onTimeSelect}
                playerRef={playerRef}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
