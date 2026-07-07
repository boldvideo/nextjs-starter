"use client";

import React from "react";
import ReactMarkdown, { Components, ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import { AskCitation } from "@/lib/ask";
import { cn } from "@/lib/utils";
import { remarkCitations } from "@/lib/remark-citations";
import { useSmoothText } from "@/hooks/use-smooth-text";
import type { Element } from "hast";

/**
 * Strip trailing citation reference lists that the AI sometimes appends.
 * These are redundant since the sources carousel already displays citations.
 * Destructive, so only ever applied at rest — never mid-stream.
 */
function stripTrailingCitationList(content: string): string {
  const idx = content.lastIndexOf("\n\n");
  if (idx === -1) return content;

  const trailing = content.slice(idx + 2).trim();
  if (!trailing) return content;

  // Count citation tokens like [c_abc123] or [1]
  const citationRefs = (
    trailing.match(/\[(?:\d+|c_[a-f0-9]+)\]/g) || []
  ).length;
  if (citationRefs < 2) return content;

  // Remove citations and raw IDs, count remaining words
  const withoutCitations = trailing
    .replace(/\[(?:\d+|c_[a-f0-9]+)\](?:\([^\)]*\))?/g, "")
    .replace(/\bc_[a-f0-9]+\b/g, "")
    .trim();

  const words = withoutCitations.split(/\s+/).filter(Boolean).length;

  // In a citation list: few words per citation (titles/timestamps only)
  // In prose: many words per citation (full sentences)
  if (words / citationRefs < 10) {
    return content.slice(0, idx).trimEnd();
  }

  return content;
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let idx = haystack.indexOf(needle);
  while (idx !== -1) {
    count++;
    idx = haystack.indexOf(needle, idx + needle.length);
  }
  return count;
}

/**
 * Split streamed markdown at the last completed block boundary (a "\n\n"
 * outside any code fence). The completed prefix is rendered by a memoized
 * section that doesn't re-parse on every delta; only the small tail block
 * re-renders while it streams.
 */
export function splitAtBlockBoundary(text: string): [string, string] {
  let from = text.length;
  while (from >= 0) {
    const idx = text.lastIndexOf("\n\n", from);
    if (idx === -1) break;
    if (countOccurrences(text.slice(0, idx), "```") % 2 === 0) {
      return [text.slice(0, idx + 2), text.slice(idx + 2)];
    }
    from = idx - 1;
  }
  return ["", text];
}

interface MarkdownSectionProps {
  content: string;
  citations: AskCitation[];
  citationDisplayNumberById?: Map<string, number>;
  onCitationClick: (citation: AskCitation) => void;
  isStreaming: boolean;
}

const MarkdownSection = React.memo(function MarkdownSection({
  content,
  citations,
  citationDisplayNumberById,
  onCitationClick,
  isStreaming,
}: MarkdownSectionProps) {
  const remarkPlugins = React.useMemo(
    () => [
      remarkGfm,
      () => remarkCitations({ citations, citationDisplayNumberById }),
    ],
    [citations, citationDisplayNumberById]
  );

  const renderCitationBadge = React.useCallback(
    (citation: AskCitation, displayNum: number) => {
      const hasValidTimestamp = citation.startMs > 0;

      // Compact superscript-style marker in the amber "signal" color —
      // the source details live in the panel/carousel, not the prose.
      return (
        <button
          type="button"
          onClick={() => onCitationClick(citation)}
          className={cn(
            "inline-block align-[0.38em] mx-px px-1 py-0.5 rounded",
            "font-mono text-[10px] font-semibold leading-none",
            "text-signal bg-[var(--signal-soft)]",
            "border border-[var(--signal-line)]",
            "hover:bg-signal hover:text-background",
            "transition-colors cursor-pointer"
          )}
          title={
            hasValidTimestamp
              ? `${citation.videoTitle} at ${citation.timestampStart}`
              : citation.videoTitle
          }
          aria-label={`Source ${displayNum}: ${citation.videoTitle}${
            hasValidTimestamp ? ` at ${citation.timestampStart}` : ""
          }`}
        >
          {displayNum}
        </button>
      );
    },
    [onCitationClick]
  );

  const renderFallbackBadge = React.useCallback(
    (ref: string, displayNum?: number) => {
      // Mid-stream a reference can be a beat ahead of its metadata — show a
      // quiet shimmer instead of a "?" that will flip to a chip moments later.
      if (displayNum == null && isStreaming) {
        return (
          <span
            className={cn(
              "inline-flex w-8 h-[1.25em] mx-0.5 align-middle",
              "rounded-full bg-primary/15 animate-pulse"
            )}
            aria-hidden="true"
          />
        );
      }

      return (
        <span
          className={cn(
            "inline-block align-[0.38em] mx-px px-1 py-0.5 rounded",
            "font-mono text-[10px] font-semibold leading-none",
            "text-signal bg-[var(--signal-soft)]",
            "border border-[var(--signal-line)]"
          )}
          title={ref}
        >
          {displayNum ?? "?"}
        </span>
      );
    },
    [isStreaming]
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
      // `start` passes through via props: a streamed list split at a block
      // boundary continues in a fresh <ol> that starts mid-count.
      ol: (props) => <ol {...props} className="list-decimal pl-5 space-y-1" />,
    };
  }, [
    citations,
    citationDisplayNumberById,
    renderCitationBadge,
    renderFallbackBadge,
  ]);

  return (
    <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
      {content}
    </ReactMarkdown>
  );
});

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
  const streaming = !!isStreaming;

  // Reveal streamed text at a steady cadence instead of network-chunk bursts.
  const smoothed = useSmoothText(content, streaming);
  const displayContent = streaming
    ? smoothed
    : stripTrailingCitationList(content);

  // While streaming, completed blocks render via a memoized section; only the
  // currently-growing tail block re-parses. At rest everything is one parse.
  const [stablePart, tailPart] = React.useMemo(
    () =>
      streaming
        ? splitAtBlockBoundary(displayContent)
        : ([displayContent, ""] as [string, string]),
    [displayContent, streaming]
  );

  const sectionProps = {
    citations,
    citationDisplayNumberById,
    onCitationClick,
    isStreaming: streaming,
  };

  return (
    <div className="w-full">
      <div
        className={cn(
          "prose prose-base max-w-none text-foreground",
          "dark:prose-invert",
          "prose-p:my-4 prose-p:leading-relaxed",
          "prose-headings:mt-6 prose-headings:mb-3 prose-headings:text-base prose-headings:font-semibold",
          "prose-strong:font-semibold prose-li:my-1",
          streaming && "chat-stream-cursor"
        )}
      >
        {stablePart.trim() ? (
          <MarkdownSection content={stablePart} {...sectionProps} />
        ) : null}
        {tailPart.trim() ? (
          <MarkdownSection content={tailPart} {...sectionProps} />
        ) : null}
      </div>
    </div>
  );
}
