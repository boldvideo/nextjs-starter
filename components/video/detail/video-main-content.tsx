"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronLeft, ChevronRight, FileText, Paperclip } from "lucide-react";
import { formatRelative } from "date-fns";
import { cn } from "@/lib/utils";
import { Transcript } from "@/components/transcript";
import { AutoplayToggle } from "../navigation/autoplay-toggle";
import { VideoDescription } from "@/components/video-description";
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
    "description" | "transcript" | "attachments"
  >("description");

  const hasTranscript =
    !!video.transcript &&
    !!video.transcript.json &&
    !!video.transcript.json.url;

  const hasAttachments = video.attachments && video.attachments.length > 0;

  return (
    <div className="w-full mx-auto flex flex-col">
      <div className="flex flex-col flex-1 mt-6 min-h-[600px] pb-24 lg:pb-8">
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

        {/* Main Pills Navigation */}
        <div className="flex items-center gap-2 border-b border-border mb-6 pb-4 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveMainTab("description")}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
              activeMainTab === "description"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            Description
          </button>
          {hasTranscript && (
            <button
              onClick={() => setActiveMainTab("transcript")}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                activeMainTab === "transcript"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              Transcript
            </button>
          )}
          {hasAttachments && (
            <button
              onClick={() => setActiveMainTab("attachments")}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                activeMainTab === "attachments"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              Attachments
              <span className="ml-2 text-xs opacity-80">
                {video.attachments?.length}
              </span>
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0">
          {activeMainTab === "description" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-1 duration-300">
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
            <div className="min-h-[600px] max-h-[calc(100vh-200px)] overflow-y-auto no-scrollbar rounded-md animate-in fade-in slide-in-from-right-1 duration-300">
              <Transcript
                url={video.transcript?.json?.url || ""}
                onCueClick={onTimeSelect}
                playerRef={playerRef}
              />
            </div>
          )}

          {activeMainTab === "attachments" && hasAttachments && (
            <div className="space-y-3 animate-in fade-in slide-in-from-right-1 duration-300">
              {video.attachments?.map((attachment) => (
                <a
                  key={attachment.id || attachment.url}
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    {attachment.type === "pdf" ? (
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    ) : (
                      <Paperclip className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium truncate">
                      {attachment.name}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {(() => {
                        try {
                          return new URL(attachment.url).hostname;
                        } catch {
                          return attachment.url;
                        }
                      })()}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
