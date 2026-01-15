"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onStop?: () => void;
  placeholder?: string;
  disabled?: boolean;
  isStreaming?: boolean;
  autoFocus?: boolean;
  suggestions?: string[];
  showSuggestions?: boolean;
  className?: string;
  disclaimer?: string;
}

const MAX_HEIGHT = 360; // Max height before scrolling

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  placeholder = "Ask a question...",
  disabled = false,
  isStreaming = false,
  autoFocus = false,
  suggestions = [],
  showSuggestions = false,
  className,
  disclaimer
}: ChatInputProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    // Set to scrollHeight, capped at MAX_HEIGHT
    const newHeight = Math.min(textarea.scrollHeight, MAX_HEIGHT);
    textarea.style.height = `${newHeight}px`;
  }, []);

  // Auto-focus on mount if requested
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Adjust height when value changes
  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!value.trim() || disabled || isStreaming) return;
    onSubmit(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter without Shift
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    textareaRef.current?.focus();
  };

  return (
    <div className={cn("w-full", className)}>
      <form ref={formRef} onSubmit={handleSubmit} className="relative">
        <div
          className={cn(
            "relative flex flex-col rounded-2xl border transition-all duration-200",
            isFocused
              ? "border-primary shadow-lg shadow-primary/10"
              : "border-border hover:border-primary/50",
            "bg-background"
          )}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled || isStreaming}
            rows={1}
            className={cn(
              "w-full px-5 pt-4 pb-2 text-base bg-transparent outline-none resize-none",
              "placeholder:text-muted-foreground/60 transition-all",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "overflow-y-auto"
            )}
            style={{ maxHeight: MAX_HEIGHT }}
            aria-label="Ask your coach a question"
          />

          {/* Bottom row with submit button */}
          <div className="flex justify-end px-3 pb-3">
            {isStreaming && onStop ? (
              <button
                type="button"
                onClick={onStop}
                className={cn(
                  "p-2.5 rounded-xl transition-all duration-200",
                  "border border-border bg-background hover:bg-accent",
                  "text-foreground"
                )}
                aria-label="Stop generating"
              >
                <Square className="h-4 w-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!value.trim() || disabled || isStreaming}
                className={cn(
                  "p-2.5 rounded-xl transition-all duration-200",
                  value.trim() && !disabled && !isStreaming
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
                aria-label="Submit question"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Disclaimer */}
      {disclaimer && (
        <p className="mt-3 text-center text-xs text-primary/70">
          {disclaimer}
        </p>
      )}

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && !value && (
        <div className="mt-4 flex flex-wrap gap-2 justify-center items-center">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              disabled={disabled || isStreaming}
              className={cn(
                "text-sm px-4 py-2 rounded-full border transition-all duration-200",
                "border-border/60 hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm",
                "text-muted-foreground hover:text-foreground",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}