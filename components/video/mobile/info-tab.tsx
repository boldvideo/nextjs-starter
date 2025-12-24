"use client";

import { ExtendedVideo } from "@/types/video-detail";
import { VideoDescription } from "@/components/video-description";
import { Transcript } from "@/components/transcript";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RefObject, useState } from "react";
import { FileText, Paperclip } from "lucide-react";
import { formatFileSize } from "@/util/format-file-size";
import { PillTab, PillTabs } from "@/components/ui/pill-tabs";

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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Pill Tabs Navigation - Fixed at top */}
      <div className="flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <PillTabs className="px-4 py-3">
          <PillTab
            active={activeTab === "description"}
            onClick={() => setActiveTab("description")}
          >
            Description
          </PillTab>
          
          {hasTranscript && (
            <PillTab
              active={activeTab === "transcript"}
              onClick={() => setActiveTab("transcript")}
            >
              Transcript
            </PillTab>
          )}

          {hasAttachments && (
            <PillTab
              active={activeTab === "attachments"}
              onClick={() => setActiveTab("attachments")}
            >
              Attachments
              <span className="ml-2 text-xs opacity-80">
                {video.attachments?.length}
              </span>
            </PillTab>
          )}
        </PillTabs>
      </div>

      {/* Tab Content - Scrollable area */}
      <div className="flex-1 overflow-y-auto p-4 pb-[60px]">
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
          </div>
        )}

        {activeTab === "transcript" && hasTranscript && (
          <div className="animate-in fade-in slide-in-from-right-1 duration-300">
            <Transcript
              url={video.transcript?.json?.url || ""}
              onCueClick={onTimeSelect}
              playerRef={playerRef}
            />
          </div>
        )}

        {activeTab === "attachments" && hasAttachments && (
          <div className="space-y-3 animate-in fade-in slide-in-from-right-1 duration-300">
            {video.attachments?.map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted hover:bg-accent/50 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
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
                    {formatFileSize(attachment.fileSize)} • {attachment.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
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
