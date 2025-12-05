"use client";

import Image from "next/image";
import { ChatInput } from "@/components/coach";

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
}: AskEmptyStateProps) {
  return (
    <div className="flex h-[calc(100vh-120px)] w-full items-center justify-center px-4 md:px-6">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-4">
          {aiAvatar && (
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full overflow-hidden">
              <Image
                src={aiAvatar}
                alt={aiName}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
            {aiName}
          </h1>
          <p className="text-lg text-muted-foreground">{greeting}</p>
        </div>

        <ChatInput
          value={query}
          onChange={setQuery}
          onSubmit={onSubmit}
          onStop={onStop}
          placeholder={placeholder}
          disabled={false}
          isStreaming={isStreaming}
          autoFocus={true}
          suggestions={suggestions}
          showSuggestions={true}
        />
      </div>
    </div>
  );
}
