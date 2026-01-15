"use client";

import { ExtendedVideo } from "@/types/video-detail";
import { VideoDescription } from "@/components/video-description";
import { Transcript } from "@/components/transcript";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RefObject, useState } from "react";
import { FileText, Paperclip, ChevronRight, X } from "lucide-react";
import { formatFileSize } from "@/util/format-file-size";
import { cn } from "@/lib/utils";

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

  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);

  const handleTranscriptTimeSelect = (time: number) => {
    onTimeSelect(time);
    setIsTranscriptOpen(false);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Single scroll view - no sub-tabs on mobile */}
      <div className="flex-1 overflow-y-auto p-4 pb-20 min-h-0">
        <div className="space-y-6">
          {/* Description */}
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
              {video.cta.buttonText && video.cta.buttonUrl && (
                <a
                  className="mt-4 inline-flex bg-foreground text-background rounded-md px-4 py-2 items-center justify-center hover:opacity-90 transition-opacity w-full"
                  href={video.cta.buttonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {video.cta.buttonText}
                </a>
              )}
            </div>
          )}

          {/* Transcript entry point */}
          {hasTranscript && (
            <button
              onClick={() => setIsTranscriptOpen(true)}
              className="w-full flex items-center justify-between rounded-lg border border-border p-4 text-left bg-muted/50 hover:bg-muted transition-colors active:scale-[0.99]"
            >
              <div>
                <div className="font-medium">Transcript</div>
                <div className="text-xs text-muted-foreground">
                  Search and jump to moments
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          )}

          {/* Attachments */}
          {hasAttachments && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">
                Attachments ({video.attachments?.length})
              </h3>
              {video.attachments?.map((attachment) => (
                <a
                  key={attachment.id}
                  href={attachment.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted hover:bg-accent/50 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center flex-shrink-0">
                    {attachment.mimeType === "application/pdf" ? (
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
                      {formatFileSize(attachment.fileSize)} •{" "}
                      {attachment.mimeType.split("/")[1]?.toUpperCase() ||
                        "FILE"}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transcript full-screen reading mode */}
      {hasTranscript && (
        <div
          className={cn(
            "fixed inset-0 z-50 bg-background flex flex-col transition-transform duration-300 ease-out motion-reduce:transition-none",
            isTranscriptOpen
              ? "translate-y-0"
              : "translate-y-full pointer-events-none"
          )}
        >
          {/* Compact header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <h2 className="font-semibold">Transcript</h2>
            <button
              onClick={() => setIsTranscriptOpen(false)}
              className="flex items-center gap-1 text-sm text-primary active:opacity-70"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>

          {/* Transcript content - full height */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-safe">
            {isTranscriptOpen && (
              <Transcript
                url={video.transcript?.json?.url || ""}
                onCueClick={handleTranscriptTimeSelect}
                playerRef={playerRef}
                mobile
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
