"use client";

import React, { useCallback } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AskCitation } from "@/lib/ask";
import { cn } from "@/lib/utils";

interface AskMessageCardProps {
  content: string;
  citations: AskCitation[];
  aiName: string;
  aiAvatar?: string;
  onCitationClick: (citation: AskCitation) => void;
  isStreaming?: boolean;
  citationDisplayNumberById?: Map<string, number>;
}

export function AskMessageCard({
  content,
  citations,
  aiName,
  aiAvatar,
  onCitationClick,
  isStreaming,
  citationDisplayNumberById,
}: AskMessageCardProps) {
  const citationMap = React.useMemo(() => {
    if (!citations.length) return new Map<string, AskCitation>();

    const map = new Map<string, AskCitation>();
    // Match both [n] and [c_xxx] formats (with optional markdown link suffix)
    const citationMatches = Array.from(
      content.matchAll(/\[(\d+|c_[^\]]+)\](?:\(citation:[^\)]+\))?/g)
    );
    const uniqueRefs = Array.from(new Set(citationMatches.map((m) => m[1])));

    uniqueRefs.forEach((ref) => {
      let citation: AskCitation | undefined;

      if (ref.startsWith("c_")) {
        citation = citations.find((c) => c.id === ref);
      } else {
        const idx = parseInt(ref, 10) - 1;
        if (idx >= 0 && idx < citations.length) {
          citation = citations[idx];
        }
      }

      if (citation) {
        map.set(ref, citation);
      }
    });

    return map;
  }, [content, citations]);

  const preprocessedText = React.useMemo(() => {
    if (!content || !citations.length) return content;

    let processedText = content;

    citationMap.forEach((citation, ref) => {
      // Match both [n] and [c_xxx] formats
      const escapedRef = ref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`\\[${escapedRef}\\](?:\\(citation:[^\\)]+\\))?`, "g");
      const displayNum = citationDisplayNumberById?.get(citation.id) ?? (/^\d+$/.test(ref) ? parseInt(ref, 10) : 1);
      processedText = processedText.replace(
        pattern,
        `@@CITATION_${displayNum}_${citation.id}@@`
      );
    });

    return processedText;
  }, [content, citations, citationMap, citationDisplayNumberById]);

  const renderTextWithCitations = useCallback(
    (text: string) => {
      if (!text || typeof text !== "string") return text;

      const pattern = /@@CITATION_(\d+)_([^@]+)@@/g;
      const parts: (string | React.ReactNode)[] = [];
      let lastIndex = 0;
      let match;

      while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push(text.substring(lastIndex, match.index));
        }

        const displayNum = parseInt(match[1], 10);
        const citationId = match[2];
        const citation = citations.find((c) => c.id === citationId);

        if (citation) {
          const videoTitle = citation.videoTitle || "Untitled";
          const title = videoTitle.length > 30
            ? videoTitle.slice(0, 30) + "..."
            : videoTitle;

          const hasValidTimestamp = citation.startMs > 0;

          parts.push(
            <button
              key={`cite-${citationId}-${match.index}`}
              onClick={() => onCitationClick(citation)}
              className={cn(
                "inline-flex items-center gap-1.5 mx-0.5",
                "px-2 py-0.5 rounded-full",
                "bg-primary/10 hover:bg-primary/20",
                "text-sm text-foreground",
                "transition-colors cursor-pointer",
                "border border-primary/20"
              )}
              title={hasValidTimestamp ? `${citation.videoTitle} at ${citation.timestampStart}` : citation.videoTitle}
            >
              <span
                className={cn(
                  "inline-flex items-center justify-center",
                  "w-4 h-4",
                  "text-[10px] font-medium",
                  "bg-primary/20 text-primary",
                  "rounded-full"
                )}
              >
                {displayNum}
              </span>
              <span className="font-medium">{title}</span>
              {hasValidTimestamp && (
                <span className="text-muted-foreground text-xs">{citation.timestampStart}</span>
              )}
            </button>
          );
        } else {
          parts.push(
            <span
              key={`cite-fallback-${match.index}`}
              className="inline-flex items-center justify-center w-4 h-4 mx-0.5 text-[10px] font-medium bg-primary/20 text-primary rounded-full"
            >
              {displayNum}
            </span>
          );
        }

        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
      }

      return parts.length > 1 ? <>{parts}</> : text;
    },
    [citations, onCitationClick]
  );

  return (
    <div className="w-full">
      <div
        className={cn(
          "prose prose-base max-w-none text-foreground",
          "dark:prose-invert",
          "prose-p:my-4 prose-p:leading-relaxed",
          "prose-headings:mt-6 prose-headings:mb-3 prose-headings:text-base prose-headings:font-semibold",
          "prose-strong:font-semibold prose-li:my-1"
        )}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children, ...props }) => {
              const processedChildren = React.Children.map(
                children,
                (child) => {
                  if (typeof child === "string") {
                    return renderTextWithCitations(child);
                  }
                  return child;
                }
              );
              return <p {...props}>{processedChildren}</p>;
            },
            li: ({ children, ...props }) => {
              const processedChildren = React.Children.map(
                children,
                (child) => {
                  if (typeof child === "string") {
                    return renderTextWithCitations(child);
                  }
                  return child;
                }
              );
              return <li {...props}>{processedChildren}</li>;
            },
            strong: ({ children, ...props }) => {
              const processedChildren = React.Children.map(
                children,
                (child) => {
                  if (typeof child === "string") {
                    return renderTextWithCitations(child);
                  }
                  return child;
                }
              );
              return <strong {...props}>{processedChildren}</strong>;
            },
            em: ({ children, ...props }) => {
              const processedChildren = React.Children.map(
                children,
                (child) => {
                  if (typeof child === "string") {
                    return renderTextWithCitations(child);
                  }
                  return child;
                }
              );
              return <em {...props}>{processedChildren}</em>;
            },
            a: ({ ...props }) => (
              <a
                {...props}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              />
            ),
            ul: ({ ...props }) => (
              <ul {...props} className="list-disc pl-5 space-y-1" />
            ),
            ol: ({ ...props }) => (
              <ol {...props} className="list-decimal pl-5 space-y-1" />
            ),
          }}
        >
          {preprocessedText}
        </ReactMarkdown>
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-primary/50 ml-1 animate-pulse" />
        )}
      </div>
    </div>
  );
}
