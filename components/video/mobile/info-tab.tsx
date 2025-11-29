"use client";

import { ExtendedVideo } from "@/types/video-detail";
import { VideoDescription } from "@/components/video-description";
import { Transcript } from "@/components/transcript";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RefObject, useState } from "react";
import { cn } from "@/lib/utils";
import { FileText, Paperclip } from "lucide-react";
import { formatFileSize } from "@/util/format-file-size";

interface InfoTabProps {
  video: ExtendedVideo;
  playerRef: RefObject<HTMLVideoElement | null>;
  onTimeSelect: (time: number) => void;
}

export default function InfoTab({
  video,
  playerRef,
  onTimeSelect,
}: InfoTabProps) {
  const hasTranscript =
    !!video.transcript &&
    !!video.transcript.json &&
    !!video.transcript.json.url;

  const hasAttachments = video.attachments && video.attachments.length > 0;

  const [activeTab, setActiveTab] = useState<
    "description" | "transcript" | "attachments"
  >("description");

  return (
    <div className="flex flex-col min-h-0 pb-20">
      {/* Pill Tabs Navigation */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-4 py-3">
          <button
            onClick={() => setActiveTab("description")}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
              activeTab === "description"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            Description
          </button>
          
          {hasTranscript && (
            <button
              onClick={() => setActiveTab("transcript")}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                activeTab === "transcript"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              Transcript
            </button>
          )}

          {hasAttachments && (
            <button
              onClick={() => setActiveTab("attachments")}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                activeTab === "attachments"
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
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === "description" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-left-1 duration-300">
            <VideoDescription text={video.description || ""} />
            
            {/* CTA if exists */}
            {video.cta && (
              <div className="rounded-lg border border-border p-4 bg-muted text-sm">
                <h2 className="font-bold mb-2">{video.cta.title}</h2>
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
                    className="mt-4 inline-flex bg-foreground text-background rounded-md px-4 py-2 items-center justify-center hover:opacity-90 transition-opacity w-full"
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

        {activeTab === "transcript" && hasTranscript && (
          <div className="animate-in fade-in slide-in-from-right-1 duration-300">
            <div className="max-h-[60vh] overflow-y-auto rounded-md border border-border">
              <Transcript
                url={video.transcript?.json?.url || ""}
                onCueClick={onTimeSelect}
                playerRef={playerRef}
              />
            </div>
          </div>
        )}

        {activeTab === "attachments" && hasAttachments && (
          <div className="space-y-3 animate-in fade-in slide-in-from-right-1 duration-300">
            {video.attachments?.map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted hover:bg-accent/50 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  {attachment.mime_type === "application/pdf" ? (
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Paperclip className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {attachment.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {formatFileSize(attachment.file_size)} • {attachment.mime_type.split('/')[1]?.toUpperCase() || 'FILE'}
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
