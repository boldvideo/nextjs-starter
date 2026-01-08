"use client";

import React from "react";
import ReactMarkdown, { Components, ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import { AskCitation } from "@/lib/ask";
import { cn } from "@/lib/utils";
import { remarkCitations } from "@/lib/remark-citations";
import type { Element } from "hast";

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
  onCitationClick,
  isStreaming,
  citationDisplayNumberById,
}: AskMessageCardProps) {
  const remarkPlugins = React.useMemo(
    () => [
      remarkGfm,
      () => remarkCitations({ citations, citationDisplayNumberById }),
    ],
    [citations, citationDisplayNumberById]
  );

  const renderCitationBadge = React.useCallback(
    (citation: AskCitation, displayNum: number) => {
      const videoTitle = citation.videoTitle || "Untitled";
      const shortTitle =
        videoTitle.length > 30 ? `${videoTitle.slice(0, 30)}...` : videoTitle;
      const hasValidTimestamp = citation.startMs > 0;

      return (
        <button
          type="button"
          onClick={() => onCitationClick(citation)}
          className={cn(
            "inline-flex items-center gap-1.5 mx-0.5",
            "px-2 py-0.5 rounded-full",
            "bg-primary/10 hover:bg-primary/20",
            "text-sm text-foreground",
            "transition-colors cursor-pointer",
            "border border-primary/20"
          )}
          title={
            hasValidTimestamp
              ? `${citation.videoTitle} at ${citation.timestampStart}`
              : citation.videoTitle
          }
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
          <span className="font-medium">{shortTitle}</span>
          {hasValidTimestamp && (
            <span className="text-muted-foreground text-xs">
              {citation.timestampStart}
            </span>
          )}
        </button>
      );
    },
    [onCitationClick]
  );

  const renderFallbackBadge = React.useCallback(
    (ref: string, displayNum?: number) => {
      return (
        <span
          className={cn(
            "inline-flex items-center justify-center",
            "w-5 h-5 mx-0.5",
            "text-[10px] font-medium",
            "bg-primary/20 text-primary",
            "rounded-full"
          )}
          title={ref}
        >
          {displayNum ?? "?"}
        </span>
      );
    },
    []
  );

  const components = React.useMemo((): Components => {
    const AnchorComponent = ({
      node,
      children,
      ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement> & ExtraProps) => {
      const hProps =
        ((node as Element | undefined)?.properties as Record<string, unknown>) || {};
      const citationId = hProps["data-citation-id"] as string | undefined;
      const citationNumStr = hProps["data-citation-num"] as string | undefined;
      const citationRef = hProps["data-citation-ref"] as string | undefined;

      if (citationId || citationRef) {
        const citation = citations.find((c) => c.id === citationId);

        if (citation && citationNumStr) {
          const displayNum = parseInt(citationNumStr, 10);
          return renderCitationBadge(citation, displayNum);
        }

        const fallbackNum = citationNumStr
          ? parseInt(citationNumStr, 10)
          : citationDisplayNumberById?.get(citationId || "") ?? undefined;
        return renderFallbackBadge(
          citationRef || citationId || "?",
          fallbackNum
        );
      }

      return (
        <a
          {...props}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {children}
        </a>
      );
    };

    return {
      a: AnchorComponent,
      ul: (props) => <ul {...props} className="list-disc pl-5 space-y-1" />,
      ol: (props) => <ol {...props} className="list-decimal pl-5 space-y-1" />,
    };
  }, [
    citations,
    citationDisplayNumberById,
    renderCitationBadge,
    renderFallbackBadge,
  ]);

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
        <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
          {content}
        </ReactMarkdown>
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-primary/50 ml-1 animate-pulse" />
        )}
      </div>
    </div>
  );
}
