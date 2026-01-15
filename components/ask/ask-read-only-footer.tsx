"use client";

import { MessageSquarePlus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AskReadOnlyFooterProps {
  onStartNew: () => void;
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
}

export function AskReadOnlyFooter({
  onStartNew,
  suggestions,
  onSuggestionClick,
}: AskReadOnlyFooterProps) {
  return (
    <div className="flex-shrink-0 border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full max-w-3xl mx-auto px-4 py-4 md:px-6 md:py-6">
        {/* Read-only notice */}
        <p className="text-sm text-muted-foreground text-center mb-4">
          This is a past conversation. Start a new chat to ask questions.
        </p>

        {/* Start new conversation CTA */}
        <button
          onClick={onStartNew}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl cursor-pointer",
            "border-2 border-primary text-primary font-medium",
            "hover:bg-primary/10 transition-colors"
          )}
        >
          <MessageSquarePlus className="h-5 w-5" />
          Start new conversation
        </button>

        {/* Suggested questions */}
        {suggestions.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-3">
              <Sparkles className="h-4 w-4" />
              <span>Or try one of these questions</span>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => onSuggestionClick(suggestion)}
                  className={cn(
                    "text-sm px-4 py-2 rounded-full border transition-all duration-200 cursor-pointer",
                    "border-border/60 hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm",
                    "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
