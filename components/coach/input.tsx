"use client";

import React, { useRef, useEffect } from "react";
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
}

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
  className
}: ChatInputProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Auto-focus on mount if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!value.trim() || disabled || isStreaming) return;
    onSubmit(e);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className={cn("w-full", className)}>
      <form ref={formRef} onSubmit={handleSubmit} className="relative">
        <div
          className={cn(
            "relative flex items-center rounded-2xl border transition-all duration-200",
            isFocused
              ? "border-primary shadow-lg shadow-primary/10"
              : "border-border hover:border-primary/50",
            "bg-background"
          )}
        >
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled || isStreaming}
            className={cn(
              "flex-1 px-6 py-4 text-base bg-transparent outline-none",
              "placeholder:text-muted-foreground/50 transition-all",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            aria-label="Ask a question"
          />
          
          {/* Submit/Stop button */}
          {isStreaming && onStop ? (
            <button
              type="button"
              onClick={onStop}
              className={cn(
                "mr-2 p-3 rounded-xl transition-all duration-200",
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
                "mr-2 p-3 rounded-xl transition-all duration-200",
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
      </form>

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && !value && (
        <div className="mt-3 flex flex-wrap gap-2 justify-center items-center">
          <span className="text-sm text-muted-foreground">Try:</span>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              disabled={disabled || isStreaming}
              className={cn(
                "text-sm px-3 py-1.5 rounded-lg border transition-colors",
                "border-border hover:border-primary/50 hover:bg-primary/5",
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