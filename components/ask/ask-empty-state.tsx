"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatInput } from "@/components/coach";
import { PersonaAvatar } from "@/components/persona-avatar";
import { PoweredByBold } from "@/components/powered-by-bold";
import { MarkerUnderline } from "@/components/home/taki-doodles";
import { askLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";

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
              <span className="relative inline-block">
                <InlineMarkdown text={head} />
                <MarkerUnderline
                  className="absolute -bottom-1.5 left-[-1%] h-[0.16em] w-[102%] text-accent"
                  delay={0.35}
                />
              </span>
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
          <span className="relative inline-block">
            <InlineMarkdown text={headline} />
            <MarkerUnderline
              className="absolute -bottom-1.5 left-[-1%] h-[0.16em] w-[102%] text-accent"
              delay={0.35}
            />
          </span>
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
        <span className="relative inline-block">
          <InlineMarkdown text={headline} />
          <MarkerUnderline
            className="absolute -bottom-1.5 left-[-1%] h-[0.16em] w-[102%] text-accent"
            delay={0.35}
          />
        </span>
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
    <div className="relative flex-1 min-h-0 overflow-y-auto flex justify-center">
      {/* Whiteboard dot paper, same as home */}
      <div aria-hidden="true" className="taki-dotgrid pointer-events-none absolute inset-0" />

      {/* Taki leans into the empty room on big screens */}
      <div className="pointer-events-none absolute bottom-0 right-[max(20px,calc(50%-660px))] hidden select-none xl:block">
        <Image
          src="/taki-cutout.webp"
          alt=""
          width={880}
          height={1321}
          className="h-[min(44vh,400px)] w-auto drop-shadow-[0_18px_36px_rgba(22,21,15,0.18)] [mask-composite:intersect] [mask-image:linear-gradient(to_top,transparent_0%,black_9%),linear-gradient(to_right,transparent_1.5%,black_15%),linear-gradient(to_left,transparent_0.5%,black_10%)]"
        />
      </div>

      <div className="relative w-full max-w-[720px] px-5 md:px-6 pt-[clamp(40px,9vh,110px)] pb-16 my-auto">
        {/* Persona identity — same character strip as the homepage chat */}
        <div className="flex items-center gap-3 mb-6">
          <PersonaAvatar
            name={aiName}
            avatar={aiAvatar}
            size={46}
            className="ring-2 ring-accent"
          />
          <div>
            <div className="font-[family-name:var(--font-heading)] font-semibold text-lg leading-tight tracking-tight">
              {askLabel(aiName)}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                aria-hidden="true"
                className="h-[7px] w-[7px] rounded-full bg-[var(--success)]"
              />
              trained on the full library · answers with receipts
            </div>
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

        {/* Conversation starters — loose slips of paper */}
        {suggestions.length > 0 && (
          <>
            <p className="font-scribble mt-6 rotate-[-1.5deg] text-lg text-foreground/75">
              or grab one of these —
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {suggestions.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => (onAsk ? onAsk(s) : setQuery(s))}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left cursor-pointer",
                    "shadow-[0_1px_2px_rgba(22,21,15,0.04)] transition-all",
                    "hover:rotate-0 hover:border-accent hover:bg-[var(--signal-soft)]",
                    i % 2 === 0 ? "rotate-[-0.35deg]" : "rotate-[0.35deg]"
                  )}
                >
                  <span className="flex-1 min-w-0 truncate text-[15px] text-muted-foreground transition-colors group-hover:text-foreground">
                    {s}
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-foreground" />
                </button>
              ))}
            </div>
          </>
        )}

        <div className="flex justify-center mt-8">
          <PoweredByBold variant="pitch" />
        </div>
      </div>
    </div>
  );
}
