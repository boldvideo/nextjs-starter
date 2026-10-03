"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { ArrowRight, ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface GymFollowUpProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isStreaming: boolean;
  /**
   * "follow-up": your own game, a quiet chat bar talking to the coach (the
   * answer's quest stays the loud thing on screen).
   * "new-game": someone else's shared game, the homepage's start bar.
   */
  variant?: "follow-up" | "new-game";
  /** Who answers: the lead coach of the last level */
  coach?: { slug: string; name: string } | null;
}

/** The bar under a game: keep talking, or start your own. */
export function GymFollowUp({
  value,
  onChange,
  onSubmit,
  onStop,
  isStreaming,
  variant = "follow-up",
  coach,
}: GymFollowUpProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const newGame = variant === "new-game";

  // Back in the input as soon as the game master finishes
  useEffect(() => {
    if (!isStreaming && !newGame && window.matchMedia("(hover: hover)").matches) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [isStreaming, newGame]);

  const stop = (
    <button
      type="button"
      onClick={onStop}
      aria-label="Stop"
      className="shrink-0 h-10 px-4 rounded-full inline-flex items-center gap-2 font-display text-sm uppercase border border-[var(--gym-line)] text-foreground/90 hover:border-[var(--gym-pink)] hover:text-[var(--gym-pink)] transition-colors cursor-pointer"
    >
      <Square className="h-3.5 w-3.5 fill-current" />
      Stop
    </button>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!isStreaming && value.trim()) onSubmit();
      }}
      className={cn(newGame && "gym-neon-frame")}
    >
      <div
        className={cn(
          "flex items-center gap-2 bg-[var(--gym-night-2)] py-1.5 pr-1.5",
          newGame
            ? "rounded-[calc(1.1rem-2px)] pl-2"
            : "rounded-full border border-[var(--gym-line)] pl-1.5 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.8)] transition-colors focus-within:border-[var(--gym-cyan)]"
        )}
      >
        {newGame ? (
          <span className="shrink-0 rounded-md bg-[var(--gym-yellow)] px-2 py-1 font-display text-[11px] uppercase leading-none text-[#1a0616]">
            New game
          </span>
        ) : (
          <Image
            src={coach ? `/gym/game/cast/${coach.slug}.webp` : "/gym/game/game-master-bot.webp"}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 shrink-0"
          />
        )}
        <label htmlFor="gym-follow-up" className="sr-only">
          {newGame ? "Ask your own question" : "Ask a follow-up"}
        </label>
        <input
          ref={inputRef}
          id="gym-follow-up"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={newGame ? "Your go-to-market problem…" : coach ? `Ask ${coach.name} a follow-up…` : "Ask a follow-up…"}
          autoComplete="off"
          disabled={isStreaming}
          className="min-w-0 flex-1 bg-transparent h-10 px-1.5 text-base md:text-lg text-foreground placeholder:text-muted-foreground/70 outline-none disabled:opacity-60"
        />
        {isStreaming ? (
          stop
        ) : newGame ? (
          <button
            type="submit"
            className="gym-button shrink-0 h-11 px-4 md:px-5 rounded-xl text-sm md:text-base uppercase inline-flex items-center gap-2 cursor-pointer"
          >
            Press start
            <ArrowRight className="hidden sm:block h-4 w-4" strokeWidth={3} />
          </button>
        ) : (
          <button
            type="submit"
            aria-label="Send"
            disabled={!value.trim()}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-foreground text-[var(--gym-night)] transition-opacity disabled:opacity-25 cursor-pointer disabled:cursor-default"
          >
            <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </form>
  );
}
