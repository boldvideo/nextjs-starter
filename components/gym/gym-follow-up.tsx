"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, Square } from "lucide-react";

interface GymFollowUpProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isStreaming: boolean;
  placeholder?: string;
}

/** The follow-up bar under a game: same neon frame as the homepage. */
export function GymFollowUp({
  value,
  onChange,
  onSubmit,
  onStop,
  isStreaming,
  placeholder = "Next level: ask a follow-up…",
}: GymFollowUpProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Back in the input as soon as the game master finishes
  useEffect(() => {
    if (!isStreaming && window.matchMedia("(hover: hover)").matches) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [isStreaming]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!isStreaming && value.trim()) onSubmit();
      }}
      className="gym-neon-frame"
    >
      <div className="flex items-center gap-2 rounded-[calc(1.1rem-2px)] bg-[var(--gym-night-2)] pl-4 md:pl-5 pr-1.5 py-1.5">
        <label htmlFor="gym-follow-up" className="sr-only">
          Ask a follow-up
        </label>
        <input
          ref={inputRef}
          id="gym-follow-up"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          disabled={isStreaming}
          className="min-w-0 flex-1 bg-transparent h-11 text-base md:text-lg text-foreground placeholder:text-muted-foreground/70 outline-none disabled:opacity-60"
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop"
            className="shrink-0 h-11 px-4 rounded-xl inline-flex items-center gap-2 font-display text-sm uppercase border border-[var(--gym-line)] text-foreground/90 hover:border-[var(--gym-pink)] hover:text-[var(--gym-pink)] transition-colors cursor-pointer"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            Stop
          </button>
        ) : (
          <button
            type="submit"
            className="gym-button shrink-0 h-11 px-4 md:px-5 rounded-xl text-sm md:text-base uppercase inline-flex items-center gap-2 cursor-pointer"
          >
            Play
            <ArrowRight className="h-4 w-4" strokeWidth={3} />
          </button>
        )}
      </div>
    </form>
  );
}
