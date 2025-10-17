import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

  return (
    <div className="min-h-[100px] text-[17px] lg:text-base leading-relaxed">
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
        {withSlashHandles}
      </ReactMarkdown>
    </div>
  );
}
