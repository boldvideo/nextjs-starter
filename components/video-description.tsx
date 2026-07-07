import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { PROSE_CLASS } from "@/lib/prose";

interface VideoDescriptionProps {
  text: string;
}

export function VideoDescription({ text }: VideoDescriptionProps) {
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

  // YouTube-imported descriptions separate lines with single newlines, which
  // markdown collapses into one paragraph. Turn them into hard breaks
  // (trailing double space) so the original formatting survives.
  const withHardBreaks = withSlashHandles.replace(/\n/g, "  \n");

  return (
    // 70ch keeps the measure in the readable 45–75 character range
    <div className={cn("min-h-[100px]", PROSE_CLASS, "max-w-[70ch]")}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            />
          ),
        }}
      >
        {withHardBreaks}
      </ReactMarkdown>
    </div>
  );
}
