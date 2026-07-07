"use client";

import { ArrowUpRight } from "lucide-react";
import { ChatInput } from "@/components/coach";
import { PersonaAvatar } from "@/components/persona-avatar";
import { PoweredByBold } from "@/components/powered-by-bold";
import { askLabel } from "@/lib/utils";

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

        <h1 className="font-[family-name:var(--font-heading)] font-bold text-4xl md:text-5xl tracking-tight leading-[1.08] mb-3">
          {greeting}
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-[52ch] mb-8">
          Ask anything from the series and get a straight answer — with the
          exact moments to watch for yourself.
        </p>

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
