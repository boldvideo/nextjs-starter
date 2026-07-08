"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText, Github, NotebookText, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { formatDuration } from "@/util/format-duration";
import { VideoDescription } from "@/components/video-description";
import { extractYouTubeId } from "@/components/players/player-youtube";
import type { ExtendedVideo } from "@/types/video-detail";
import { formatFileSize } from "@/util/format-file-size";

interface EpisodeLinks {
  showNotesUrl: string;
  codeUrl: string | null;
  episodeNumber: string | null;
}

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

  // Official episode links (show notes + session source code) from the
  // show's podcast index, matched exactly by YouTube id.
  const [episode, setEpisode] = useState<EpisodeLinks | null>(null);
  useEffect(() => {
    const yt = extractYouTubeId(video);
    if (!yt) return;
    let cancelled = false;
    fetch(`/api/show-notes?yt=${yt}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.episode) setEpisode(d.episode);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [video]);

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
          {episode?.episodeNumber && (
            <>
              <span
                aria-hidden="true"
                className="w-[3px] h-[3px] rounded-full bg-muted-foreground/40"
              />
              <span className="text-primary">EP {episode.episodeNumber}</span>
            </>
          )}
          {episode && (
            <span className="ml-auto flex items-center gap-2">
              <a
                href={episode.showNotesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 border border-border rounded px-2 py-1 hover:text-foreground hover:border-muted-foreground/40 transition-colors"
              >
                <NotebookText className="h-3.5 w-3.5" />
                Show notes
              </a>
              {episode.codeUrl && (
                <a
                  href={episode.codeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 border border-border rounded px-2 py-1 hover:text-foreground hover:border-muted-foreground/40 transition-colors"
                >
                  <Github className="h-3.5 w-3.5" />
                  Session code
                </a>
              )}
            </span>
          )}
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
