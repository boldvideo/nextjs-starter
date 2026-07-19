"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { PROSE_CLASS } from "@/lib/prose";

interface VideoDescriptionProps {
  text: string;
  /** Seek the player — makes YouTube-style timestamps (00:02:51) clickable. */
  onTimeSelect?: (seconds: number) => void;
}

function timestampToSeconds(ts: string): number {
  return ts
    .split(":")
    .map(Number)
    .reduce((acc, part) => acc * 60 + part, 0);
}

export function VideoDescription({ text, onTimeSelect }: VideoDescriptionProps) {
  // Convert URLs to markdown links
  const withLinks = text.replace(
    /(https?:\/\/[^\s]+)/g,
    (url) => `[${url}](${url})`
  );

  // Convert Twitter handles to links
  const withTwitterHandles = withLinks.replace(
    /(?:^|\s)@(\w+)/g,
    (match, handle) => ` [@${handle}](https://twitter.com/${handle})`
  );

  // Convert Twitter-style mentions (/username) to links
  const withSlashHandles = withTwitterHandles.replace(
    /(?:^|\s)\/(\w+)/g,
    (match, handle) => ` [/${handle}](https://twitter.com/${handle})`
  );

  // Convert YouTube-style timestamps (0:42, 12:34, 1:02:51) into seek links.
  // Runs after URL conversion and requires a leading boundary so digits
  // inside URLs never match.
  const withTimestamps = onTimeSelect
    ? withSlashHandles.replace(
        /(^|[\s(])((?:\d{1,2}:)?\d{1,2}:\d{2})(?=$|[\s).,:;!?])/gm,
        (match, lead, ts) => `${lead}[${ts}](#t=${timestampToSeconds(ts)})`
      )
    : withSlashHandles;

  // YouTube-imported descriptions separate lines with single newlines, which
  // markdown collapses into one paragraph. Turn them into hard breaks
  // (trailing double space) so the original formatting survives.
  const withHardBreaks = withTimestamps.replace(/\n/g, "  \n");

  return (
    // 70ch keeps the measure in the readable 45–75 character range
    <div className={cn("min-h-[100px]", PROSE_CLASS, "max-w-[70ch]")}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => {
            if (href?.startsWith("#t=") && onTimeSelect) {
              const seconds = parseInt(href.slice(3), 10);
              return (
                <button
                  type="button"
                  onClick={() => onTimeSelect(seconds)}
                  className={cn(
                    "font-mono text-[0.88em] font-medium no-underline",
                    "text-[var(--warning)] bg-primary/10 border border-primary/25 rounded",
                    "px-1.5 py-px align-baseline",
                    "hover:bg-primary/25 transition-colors cursor-pointer"
                  )}
                  title="Jump to this moment"
                >
                  {children}
                </button>
              );
            }
            return (
              <a
                {...props}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline decoration-accent decoration-2 underline-offset-[3px] hover:bg-[var(--signal-soft)]"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {withHardBreaks}
      </ReactMarkdown>
    </div>
  );
}
