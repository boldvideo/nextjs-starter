"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText, Paperclip } from "lucide-react";
import { formatRelative } from "date-fns";
import { Transcript } from "@/components/transcript";
import { VideoDescription } from "@/components/video-description";
import type { ExtendedVideo } from "@/types/video-detail";
import { formatFileSize } from "@/util/format-file-size";
import { PillTab, PillTabs } from "@/components/ui/pill-tabs";

interface VideoMainContentProps {
  video: ExtendedVideo;
  onTimeSelect: (time: number) => void;
  playerRef: React.RefObject<HTMLVideoElement | null>;
}

export function VideoMainContent({
  video,
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
    <div className="w-full mx-auto flex flex-col flex-1 min-h-0">
      <div className="flex flex-col flex-1 min-h-0 mt-6 pb-24 lg:pb-8">
        {/* Title & Metadata - hidden on mobile since videoMeta shows it */}
        <div className="hidden lg:block mb-2">
          <h1 className="text-2xl lg:text-3xl font-bold line-clamp-2 leading-tight">
            {video.title}
          </h1>
        </div>
        <div className="hidden lg:flex items-center gap-4 text-base text-muted-foreground mb-6">
          <span>
            {video.publishedAt &&
              formatRelative(new Date(video.publishedAt), new Date())}
          </span>
        </div>

        {/* Main Pills Navigation */}
        <PillTabs
          className={`border-b border-border ${
            activeMainTab === "transcript" ? "mb-0 pb-3" : "mb-6 pb-4"
          }`}
        >
          <PillTab
            active={activeMainTab === "description"}
            onClick={() => setActiveMainTab("description")}
          >
            Description
          </PillTab>
          {hasTranscript && (
            <PillTab
              active={activeMainTab === "transcript"}
              onClick={() => setActiveMainTab("transcript")}
            >
              Transcript
            </PillTab>
          )}
          {hasAttachments && (
            <PillTab
              active={activeMainTab === "attachments"}
              onClick={() => setActiveMainTab("attachments")}
            >
              Attachments
              <span className="ml-2 text-xs opacity-80">
                {video.attachments?.length}
              </span>
            </PillTab>
          )}
        </PillTabs>

        {/* Tab Content */}
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          {activeMainTab === "description" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-1 duration-300 pb-8">
              <VideoDescription text={video.description || ""} />
              {video.cta && (
                <div className="rounded-lg border border-border p-6 bg-muted">
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
                  {video.cta.buttonText && video.cta.buttonUrl && (
                    <a
                      className="mt-4 inline-flex bg-foreground text-background rounded-md px-4 py-2 items-center justify-center hover:opacity-90 transition-opacity"
                      href={video.cta.buttonUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {video.cta.buttonText}
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {activeMainTab === "transcript" && hasTranscript && (
            <div className="animate-in fade-in slide-in-from-right-1 duration-300 pb-8">
              <Transcript
                url={video.transcript?.json?.url || ""}
                onCueClick={onTimeSelect}
                playerRef={playerRef}
                compact
              />
            </div>
          )}

          {activeMainTab === "attachments" && hasAttachments && (
            <div className="space-y-3 animate-in fade-in slide-in-from-right-1 duration-300">
              {video.attachments?.map((attachment) => (
                <a
                  key={attachment.id}
                  href={attachment.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted hover:bg-accent/50 transition-colors"
                >
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    {attachment.mimeType === "application/pdf" ? (
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    ) : (
                      <Paperclip className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium truncate">
                      {attachment.title}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {formatFileSize(attachment.fileSize)} • {attachment.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
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
