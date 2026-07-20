"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export interface TakiChatChip {
  /** Short handwritten label shown on the chip. */
  label: string;
  /** The full question sent to /ask. */
  question: string;
}

interface TakiChatProps {
  aiName: string;
  avatarUrl?: string;
  videoCount: number | null;
  chips: TakiChatChip[];
  className?: string;
}

type ScriptStep = 0 | 1 | 2 | 3 | 4;
// 0: idle · 1: typing · 2: msg1 · 3: typing · 4: msg2 + chips

/**
 * The homepage chat — a scripted two-line hello from Taki AI that hands
 * off to /ask for the real streamed answer. The theatre is the typing
 * rhythm; the product is one Enter key away.
 */
export function TakiChat({
  aiName,
  avatarUrl,
  videoCount,
  chips,
  className,
}: TakiChatProps) {
  const router = useRouter();
  const [step, setStep] = useState<ScriptStep>(0);
  const [query, setQuery] = useState("");
  const [leaving, setLeaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const messages = [
    "G'day Rockstar — Taki here. Well… the AI version. Slightly less caffeinated.",
    videoCount
      ? `I've watched all ${videoCount} of my videos so you don't have to. What are we working on?`
      : "I've watched every video in here so you don't have to. What are we working on?",
  ];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStep(4);
      return;
    }
    const timers = [
      window.setTimeout(() => setStep(1), 450),
      window.setTimeout(() => setStep(2), 1650),
      window.setTimeout(() => setStep(3), 2100),
      window.setTimeout(() => setStep(4), 3050),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const ask = (question: string) => {
    const q = question.trim();
    if (!q || leaving) return;
    setLeaving(true);
    router.push(`/ask?q=${encodeURIComponent(q)}`);
  };

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-[20px] border border-border bg-surface",
        "shadow-[0_2px_4px_rgba(22,21,15,0.05),0_28px_60px_-16px_rgba(22,21,15,0.22)]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-background/70 px-4 py-3">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={38}
            height={38}
            className="h-[38px] w-[38px] rounded-full object-cover ring-2 ring-accent"
          />
        ) : (
          <span className="font-marker flex h-[38px] w-[38px] items-center justify-center rounded-full bg-accent text-lg">
            T
          </span>
        )}
        <div className="min-w-0">
          <div className="text-[15px] font-semibold leading-tight">{aiName}</div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              aria-hidden="true"
              className="h-[7px] w-[7px] rounded-full bg-[var(--success)]"
            />
            {videoCount
              ? `trained on ${videoCount} videos · answers with receipts`
              : "trained on the full library · answers with receipts"}
          </div>
        </div>
      </div>

      {/* Conversation */}
      <div
        role="log"
        aria-live="polite"
        className="no-scrollbar flex h-[184px] flex-col items-start gap-2.5 overflow-y-auto px-4 py-4 sm:h-[248px]"
      >
        {messages.slice(0, step >= 4 ? 2 : step >= 2 ? 1 : 0).map((m) => (
          <div
            key={m}
            className="animate-taki-pop max-w-[88%] rounded-2xl rounded-bl-md border border-border/70 bg-muted px-3.5 py-2.5 text-[15px] leading-relaxed"
          >
            {m}
          </div>
        ))}
        {(step === 1 || step === 3) && (
          <div
            aria-hidden="true"
            className="animate-taki-pop flex items-center gap-[5px] rounded-2xl rounded-bl-md border border-border/70 bg-muted px-4 py-3.5"
          >
            <i className="animate-taki-blink h-[7px] w-[7px] rounded-full bg-muted-foreground/70" />
            <i className="animate-taki-blink h-[7px] w-[7px] rounded-full bg-muted-foreground/70 [animation-delay:0.2s]" />
            <i className="animate-taki-blink h-[7px] w-[7px] rounded-full bg-muted-foreground/70 [animation-delay:0.4s]" />
          </div>
        )}
      </div>

      {/* Conversation starters */}
      <div className="flex min-h-[46px] flex-wrap items-end gap-2 px-4 pb-3">
        {step >= 4 &&
          chips.map((chip, i) => (
            <button
              key={chip.question}
              type="button"
              onClick={() => ask(chip.question)}
              className={cn(
                "animate-taki-pop font-scribble cursor-pointer rounded-full border-[1.5px] border-border px-3.5 py-1 text-lg leading-snug text-foreground/90",
                "transition-colors hover:border-accent hover:bg-[var(--signal-soft)]",
                i % 2 === 0 ? "rotate-[-0.8deg]" : "rotate-[0.7deg]"
              )}
              style={{ animationDelay: `${i * 0.09}s` }}
            >
              {chip.label}
            </button>
          ))}
      </div>

      {/* Input */}
      <form
        className="flex gap-2 border-t border-border bg-background/70 px-3 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          ask(query);
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask me anything…"
          aria-label={`Ask ${aiName} a question`}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[15px] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <button
          type="submit"
          disabled={leaving}
          className="font-marker cursor-pointer rounded-xl bg-accent px-4 text-[15px] text-accent-foreground shadow-[0_2px_0_rgba(22,21,15,0.25)] transition-transform hover:-rotate-2 hover:scale-105 disabled:opacity-60"
        >
          {leaving ? "…" : "ASK"}
        </button>
      </form>
    </div>
  );
}
