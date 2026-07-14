"use client";

import React from "react";
import Link from "next/link";
import ReactMarkdown, { Components, ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";
import { AskCitation } from "@/lib/ask";
import { buildVideoUrl } from "@/lib/video-path";
import { cn } from "@/lib/utils";
import { remarkCitations } from "@/lib/remark-citations";
import { PROSE_CLASS } from "@/lib/prose";
import { useSmoothText } from "@/hooks/use-smooth-text";
import type { Element, ElementContent } from "hast";

/**
 * Strip trailing citation reference lists that the AI sometimes appends.
 * These are redundant since the sources rail already displays citations.
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
 * outside a code fence). The completed prefix is rendered by a memoized
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

/** Collect the plain text of a hast subtree (for the copy button). */
function hastText(node: ElementContent | Element | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.value;
  if ("children" in node) {
    return node.children.map((c) => hastText(c as ElementContent)).join("");
  }
  return "";
}

/** Loose title comparison: lowercase, strip emoji/punctuation/numbers noise. */
function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Match an episode mention like `Episode 8 ("Human as Tools")` against the
 * answer's sources so it can deep-link to the video.
 */
function findMentionedVideo(
  text: string,
  citations: AskCitation[]
): AskCitation | null {
  const quoted = text.match(/["“”']([^"“”']{4,})["“”']/)?.[1];
  if (!quoted) return null;
  const needle = normalizeTitle(quoted);
  if (needle.length < 4) return null;
  return (
    citations.find((c) =>
      normalizeTitle(c.videoTitle || "").includes(needle)
    ) ?? null
  );
}

/**
 * Italic mentions set the whole emphasized run as the candidate title
 * (*The Self-Healing Agent Loop…*), no quotes involved. Length guard keeps
 * ordinary emphasis (*really*) from turning into links.
 */
function findTitleMatch(
  text: string,
  citations: AskCitation[]
): AskCitation | null {
  const needle = normalizeTitle(text);
  if (needle.length < 8) return null;
  return (
    citations.find((c) => {
      const title = normalizeTitle(c.videoTitle || "");
      return title.length > 0 && (title.includes(needle) || needle.includes(title));
    }) ?? null
  );
}

function extractReactText(children: React.ReactNode): string {
  return React.Children.toArray(children)
    .map((c) => {
      if (typeof c === "string" || typeof c === "number") return String(c);
      if (React.isValidElement(c)) {
        const props = c.props as { children?: React.ReactNode };
        return extractReactText(props.children);
      }
      return "";
    })
    .join("");
}

/** Fenced code block with a language bar and copy button. */
function CodeBlock({
  lang,
  text,
  children,
}: {
  lang: string;
  text: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = React.useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="not-prose my-5 rounded-lg border border-border overflow-hidden bg-surface">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/60 font-mono text-[11px] text-muted-foreground/80">
        <span>{lang}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
        >
          {copied ? (
            <Check className="h-3 w-3" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre className="m-0 px-4 py-3.5 overflow-x-auto text-sm leading-relaxed">
        {children}
      </pre>
    </div>
  );
}

interface MarkdownSectionProps {
  content: string;
  citations: AskCitation[];
  citationDisplayNumberById?: Map<string, number>;
  onCitationClick: (citation: AskCitation) => void;
  isStreaming: boolean;
  selectedCitationId?: string;
}

const MarkdownSection = React.memo(function MarkdownSection({
  content,
  citations,
  citationDisplayNumberById,
  onCitationClick,
  isStreaming,
  selectedCitationId,
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
      const isActive = citation.id === selectedCitationId;

      // Compact superscript-style marker in the amber "signal" color —
      // the source details live in the rail/panel, not the prose.
      return (
        <button
          type="button"
          onClick={() => onCitationClick(citation)}
          className={cn(
            "inline-block align-[0.38em] mx-px px-1 py-0.5 rounded",
            "font-mono text-[10px] font-semibold leading-none",
            "border border-[var(--signal-line)]",
            "transition-colors cursor-pointer",
            isActive
              ? "bg-signal text-background"
              : "text-signal bg-[var(--signal-soft)] hover:bg-signal hover:text-background"
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
    [onCitationClick, selectedCitationId]
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
      // Episode mentions like **Episode 8 ("Human as Tools")** deep-link to
      // the video when the quoted title matches one of the answer's sources.
      strong: ({ children }) => {
        const mentioned = findMentionedVideo(
          extractReactText(children),
          citations
        );
        if (mentioned) {
          return (
            <Link
              href={buildVideoUrl({ id: mentioned.videoId })}
              className={cn(
                "font-semibold text-foreground no-underline",
                "border-b border-primary/40 hover:border-primary",
                "transition-colors"
              )}
            >
              {children}
            </Link>
          );
        }
        return <strong>{children}</strong>;
      },
      // Italicized episode titles (*The Self-Healing Agent Loop…*) deep-link
      // to the video when the emphasized text matches a source's title.
      em: ({ children }) => {
        const mentioned = findTitleMatch(extractReactText(children), citations);
        if (mentioned) {
          return (
            <Link
              href={buildVideoUrl({ id: mentioned.videoId })}
              className={cn(
                "italic text-foreground no-underline",
                "border-b border-primary/40 hover:border-primary",
                "transition-colors"
              )}
            >
              {children}
            </Link>
          );
        }
        return <em>{children}</em>;
      },
      ul: (props) => <ul {...props} className="list-disc pl-5 space-y-2" />,
      // `start` passes through via props: a streamed list split at a block
      // boundary continues in a fresh <ol> that starts mid-count.
      ol: (props) => <ol {...props} className="list-decimal pl-5 space-y-2" />,
      pre: ({ node, children }) => {
        const el = node as Element | undefined;
        const codeNode = el?.children?.find(
          (c): c is Element => c.type === "element" && c.tagName === "code"
        );
        const cls = Array.isArray(codeNode?.properties?.className)
          ? (codeNode?.properties?.className as string[]).join(" ")
          : String(codeNode?.properties?.className || "");
        const lang = /language-([\w-]+)/.exec(cls)?.[1] || "text";
        return (
          <CodeBlock lang={lang} text={hastText(codeNode)}>
            {children}
          </CodeBlock>
        );
      },
      code: ({ className, children, ...props }) => {
        const isBlock =
          (className || "").includes("language-") ||
          extractReactText(children).includes("\n");
        if (isBlock) {
          // Rendered inside CodeBlock's <pre>
          return (
            <code
              {...props}
              className="font-mono text-sm text-foreground/90 bg-transparent"
            >
              {children}
            </code>
          );
        }
        return (
          <code
            {...props}
            className={cn(
              "font-mono text-[0.86em] font-normal",
              "text-primary dark:text-[#5eead4] bg-muted",
              "border border-border/50 rounded-[4px] px-[5px] py-px",
              "before:content-none after:content-none"
            )}
          >
            {children}
          </code>
        );
      },
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
  selectedCitationId?: string;
}

export function AskMessageCard({
  content,
  citations,
  onCitationClick,
  isStreaming,
  citationDisplayNumberById,
  selectedCitationId,
}: AskMessageCardProps) {
  const streaming = !!isStreaming;

  // Reveal streamed text at a steady cadence instead of network-chunk bursts.
  const smoothed = useSmoothText(content, streaming);
  const revealed = streaming ? smoothed : stripTrailingCitationList(content);

  // Citations should hug the sentence ("systems.[1][2]") — the model often
  // emits a space before the ref. Safe mid-stream: the holdback never reveals
  // a partial "[…" token, so the space collapses in the same frame the ref
  // appears.
  const displayContent = React.useMemo(
    () => revealed.replace(/[ \t]+(\[(?:\d+|c_[^\]]+)\])/g, "$1"),
    [revealed]
  );

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
    selectedCitationId,
  };

  return (
    <div className="w-full">
      <div
        className={cn(PROSE_CLASS, streaming && "chat-stream-cursor")}
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
