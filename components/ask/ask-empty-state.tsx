"use client";

import { ArrowUpRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatInput } from "@/components/coach";
import { PersonaAvatar } from "@/components/persona-avatar";
import { PoweredByBold } from "@/components/powered-by-bold";
import { askLabel } from "@/lib/utils";

const H1_CLASS =
  "font-[family-name:var(--font-heading)] font-bold text-4xl md:text-5xl tracking-tight leading-[1.08] mb-3";
const SUB_CLASS =
  "text-lg text-muted-foreground leading-relaxed max-w-[52ch] mb-8";

/**
 * The configured greeting, markdown-aware. A one-line greeting renders as
 * the big headline with the default sub copy. A multi-line greeting replaces
 * both: its first line (or leading heading) is the headline and the rest
 * renders as markdown body.
 */
function Greeting({ greeting }: { greeting: string }) {
  // The admin greeting field is single-line, so line breaks arrive as a
  // typed literal "\n" — treat those as real newlines.
  const text = greeting.replace(/\\n/g, "\n").trim();
  const isMultiline = text.includes("\n");
  const startsWithHeading = /^#{1,6}\s/.test(text);

  // Headline = leading heading if present, else the first line promoted.
  const [firstLine, ...restLines] = text.split("\n");
  const headline = startsWithHeading
    ? firstLine.replace(/^#{1,6}\s+/, "")
    : firstLine;
  const body = restLines.join("\n").trim();

  if (!isMultiline) {
    // A long one-liner would render as a wall of display type. Split it at
    // the first natural break (em dash or sentence end) — the opener
    // becomes the headline, the rest reads as body copy.
    if (text.length > 90) {
      const dashIdx = text.indexOf("—");
      const sentenceMatch = text.match(/^(.{10,90}?[.!?])\s/);
      const splitIdx =
        dashIdx > 10 && dashIdx < 90
          ? dashIdx
          : sentenceMatch
            ? sentenceMatch[1].length
            : -1;
      if (splitIdx > 0) {
        const head = text.slice(0, splitIdx).trim();
        let rest = text.slice(splitIdx).replace(/^[—\s]+/, "").trim();
        rest = rest.charAt(0).toUpperCase() + rest.slice(1);
        return (
          <>
            <h1 className={H1_CLASS}>
              <InlineMarkdown text={head} />
            </h1>
            <p className={SUB_CLASS}>
              <InlineMarkdown text={rest} />
            </p>
          </>
        );
      }
    }
    return (
      <>
        <h1 className={H1_CLASS}>
          <InlineMarkdown text={headline} />
        </h1>
        <p className={SUB_CLASS}>
          Ask anything from the library and get a straight answer — with the
          exact moments to watch for yourself.
        </p>
      </>
    );
  }

  return (
    <div className="mb-8">
      <h1 className={H1_CLASS}>
        <InlineMarkdown text={headline} />
      </h1>
      <GreetingBody body={body} />
    </div>
  );
}

/** Render a single line of markdown without the wrapping <p>. */
function InlineMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <>{children}</>,
        strong: ({ children }) => <strong>{children}</strong>,
        em: ({ children }) => <em>{children}</em>,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

function GreetingBody({ body }: { body: string }) {
  if (!body) return null;
  return (
    <div>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // The page headline is already extracted — headings inside the
          // body render at section scale.
          h1: ({ children }) => (
            <h2 className="font-[family-name:var(--font-heading)] font-semibold text-2xl tracking-tight mt-5 mb-2">
              {children}
            </h2>
          ),
          h2: ({ children }) => (
            <h2 className="font-[family-name:var(--font-heading)] font-semibold text-2xl tracking-tight mt-5 mb-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-[family-name:var(--font-heading)] font-semibold text-xl tracking-tight mt-4 mb-2">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-lg text-muted-foreground leading-relaxed max-w-[52ch] mb-3 last:mb-0">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 text-lg text-muted-foreground leading-relaxed mb-3">
              {children}
            </ul>
          ),
        }}
      >
        {body.replace(/\n/g, "  \n")}
      </ReactMarkdown>
    </div>
  );
}

interface AskEmptyStateProps {
  query: string;
  setQuery: (query: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onStop: () => void;
  isStreaming: boolean;
  aiName: string;
  aiAvatar?: string;
  greeting: string;
  suggestions: string[];
  placeholder: string;
  disclaimer?: string;
  /** Submit a conversation starter immediately (bypasses the input state). */
  onAsk?: (question: string) => void;
  // Multimodal (Phase 2)
  multimodalEnabled?: boolean;
  images?: File[];
  onImagesChange?: (images: File[]) => void;
  maxImages?: number;
  acceptedMediaTypes?: string[];
}

export function AskEmptyState({
  query,
  setQuery,
  onSubmit,
  onStop,
  isStreaming,
  aiName,
  aiAvatar,
  greeting,
  suggestions,
  placeholder,
  disclaimer,
  onAsk,
  multimodalEnabled,
  images,
  onImagesChange,
  maxImages,
  acceptedMediaTypes,
}: AskEmptyStateProps) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex justify-center">
      <div className="w-full max-w-[720px] px-5 md:px-6 pt-[clamp(40px,9vh,110px)] pb-16 my-auto">
        {/* Persona identity */}
        <div className="flex items-center gap-3 mb-6">
          <PersonaAvatar name={aiName} avatar={aiAvatar} size={46} />
          <div className="font-[family-name:var(--font-heading)] font-semibold text-lg tracking-tight">
            {askLabel(aiName)}
          </div>
        </div>

        <Greeting greeting={greeting} />

        <ChatInput
          value={query}
          onChange={setQuery}
          onSubmit={onSubmit}
          onStop={onStop}
          placeholder={placeholder}
          disabled={false}
          isStreaming={isStreaming}
          autoFocus={true}
          suggestions={[]}
          showSuggestions={false}
          disclaimer={disclaimer}
          multimodalEnabled={multimodalEnabled}
          images={images}
          onImagesChange={onImagesChange}
          maxImages={maxImages}
          acceptedMediaTypes={acceptedMediaTypes}
        />

        {/* Conversation starters — single line rows */}
        {suggestions.length > 0 && (
          <div className="flex flex-col gap-px mt-5 bg-border/60 border border-border rounded-lg overflow-hidden">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => (onAsk ? onAsk(s) : setQuery(s))}
                className="group flex items-center gap-3 px-4 py-[13px] text-left bg-surface hover:bg-muted transition-colors cursor-pointer"
              >
                <span className="flex-1 min-w-0 truncate text-base text-muted-foreground group-hover:text-foreground transition-colors">
                  {s}
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/50 group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-center mt-8">
          <PoweredByBold variant="pitch" />
        </div>
      </div>
    </div>
  );
}
