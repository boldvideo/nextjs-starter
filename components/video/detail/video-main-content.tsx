"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { formatDuration } from "@/util/format-duration";
import { VideoDescription } from "@/components/video-description";
import type { ExtendedVideo } from "@/types/video-detail";
import { formatFileSize } from "@/util/format-file-size";

interface VideoMainContentProps {
  video: ExtendedVideo;
  onTimeSelect: (time: number) => void;
  playerRef: React.RefObject<HTMLVideoElement | null>;
}

/**
 * Content under the player — flows as a normal document (the page column
 * scrolls). Transcript and chapters live in the companion sidebar; this is
 * the reference layer: title, meta, description, CTA, attachments.
 */
export function VideoMainContent({ video, onTimeSelect }: VideoMainContentProps) {
  const hasAttachments = video.attachments && video.attachments.length > 0;

  return (
    <div className="w-full mx-auto flex flex-col">
      <div className="flex flex-col mt-6 pb-24 lg:pb-16">
        {/* Title & Metadata - hidden on mobile since videoMeta shows it */}
        <div className="hidden lg:block mb-2">
          <h1 className="font-[family-name:var(--font-heading)] text-2xl lg:text-3xl font-bold tracking-tight line-clamp-2 leading-tight">
            {video.title}
          </h1>
        </div>
        <div className="hidden lg:flex items-center gap-3.5 font-mono text-xs text-muted-foreground mb-8">
          {video.publishedAt && (
            <span>{format(new Date(video.publishedAt), "MMM d, yyyy")}</span>
          )}
          {video.publishedAt && video.duration ? (
            <span
              aria-hidden="true"
              className="w-[3px] h-[3px] rounded-full bg-muted-foreground/40"
            />
          ) : null}
          {video.duration ? <span>{formatDuration(video.duration)}</span> : null}
        </div>

        {/* Description flows like an article */}
        <div className="space-y-6">
          <VideoDescription
            text={video.description || ""}
            onTimeSelect={onTimeSelect}
          />
          {video.cta && (
            <div className="rounded-lg border border-border p-6 bg-muted max-w-[70ch]">
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

          {/* Attachments */}
          {hasAttachments && (
            <div className="max-w-[70ch]">
              <h2 className="font-[family-name:var(--font-heading)] font-semibold text-xl tracking-tight mb-3">
                Attachments
              </h2>
              <div className="space-y-3">
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
                        {formatFileSize(attachment.fileSize)} •{" "}
                        {attachment.mimeType.split("/")[1]?.toUpperCase() ||
                          "FILE"}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
