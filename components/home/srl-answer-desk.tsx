"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SrlAnswerDeskProps {
  videoCount: number | null;
  className?: string;
}

type ScriptStep = 0 | 1 | 2 | 3 | 4;
// 0: idle · 1: typing · 2: msg1 · 3: typing · 4: msg2 + chips

const HOSTS = [
  { initials: "EK", name: "Ed Kang", color: "#c65a3f" },
  { initials: "WS", name: "Wil Schroter", color: "#4a47a3" },
  { initials: "RR", name: "Ryan Rutan", color: "#2e8f7b" },
];

const CHIPS = [
  {
    label: "Fix my pitch deck",
    question: "What are the biggest mistakes founders make in their pitch decks?",
  },
  {
    label: "How much should I raise?",
    question: "How much should I actually raise for my pre-seed round?",
  },
  {
    label: "Get investor meetings",
    question: "How do I get meetings with investors without warm intros?",
  },
];

/**
 * The homepage centerpiece: one quiet chat card. The three hosts up
 * top, a scripted two-line hello in the stage panel (their purple, in
 * dark mode), quick-reply chips, and a single ask action. The real
 * streamed answer happens on /ask.
 */
export function SrlAnswerDesk({ videoCount, className }: SrlAnswerDeskProps) {
  const router = useRouter();
  const [step, setStep] = useState<ScriptStep>(0);
  const [query, setQuery] = useState("");
  const [leaving, setLeaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const messages = [
    "Welcome to the Answer Desk. Every episode of SRL — every pitch deck teardown, every funding reality check — lives in here.",
    videoCount
      ? `Ask anything. I'll pull the exact moments Ed, Wil & Ryan covered it, across all ${videoCount} full shows.`
      : "Ask anything. I'll pull the exact moments Ed, Wil & Ryan covered it on the show.",
  ];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- skip the intro theatre for reduced motion
      setStep(4);
      return;
    }
    const timers = [
      window.setTimeout(() => setStep(1), 450),
      window.setTimeout(() => setStep(2), 1500),
      window.setTimeout(() => setStep(3), 1950),
      window.setTimeout(() => setStep(4), 2900),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const ask = (question: string) => {
    const q = question.trim();
    if (leaving) return;
    if (!q) {
      inputRef.current?.focus();
      return;
    }
    setLeaving(true);
    router.push(`/ask?q=${encodeURIComponent(q)}`);
  };

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-border bg-surface text-left",
        "shadow-[0_1px_2px_var(--shadow),0_24px_56px_-24px_var(--shadow)]",
        className
      )}
    >
      {/* Desk header: the three hosts + status */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex -space-x-2">
          {HOSTS.map((host) => (
            <span
              key={host.initials}
              title={host.name}
              className="flex h-8 w-8 items-center justify-center rounded-full font-heading text-[11px] font-bold text-white ring-2 ring-surface"
              style={{ backgroundColor: host.color }}
            >
              {host.initials}
            </span>
          ))}
        </div>
        <div className="min-w-0">
          <div className="font-heading text-[15px] font-bold leading-tight">
            The SRL Answer Desk
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              aria-hidden="true"
              className="h-[7px] w-[7px] rounded-full"
              style={{ backgroundColor: "var(--success)" }}
            />
            always on · answers with receipts
          </div>
        </div>
      </div>

      {/* The stage — their purple panel, holding the conversation */}
      <div
        role="log"
        aria-live="polite"
        className="no-scrollbar flex h-[236px] flex-col items-start gap-2.5 overflow-y-auto px-4 py-4 sm:h-[256px]"
        style={{
          backgroundColor: "var(--stage-panel)",
          color: "var(--stage-panel-foreground)",
        }}
      >
        {messages.slice(0, step >= 4 ? 2 : step >= 2 ? 1 : 0).map((m) => (
          <div
            key={m}
            className="animate-srl-pop max-w-[88%] rounded-lg rounded-bl-[4px] px-3.5 py-2.5 text-[14px] leading-relaxed"
            style={{ backgroundColor: "var(--stage-bubble)" }}
          >
            {m}
          </div>
        ))}
        {(step === 1 || step === 3) && (
          <div
            aria-hidden="true"
            className="animate-srl-pop flex items-center gap-[5px] rounded-lg rounded-bl-[4px] px-4 py-3.5"
            style={{ backgroundColor: "var(--stage-bubble)" }}
          >
            <i className="animate-srl-blink h-[6px] w-[6px] rounded-full bg-current opacity-70" />
            <i className="animate-srl-blink h-[6px] w-[6px] rounded-full bg-current opacity-70 [animation-delay:0.2s]" />
            <i className="animate-srl-blink h-[6px] w-[6px] rounded-full bg-current opacity-70 [animation-delay:0.4s]" />
          </div>
        )}

        {/* Quick replies, arriving with the second message */}
        {step >= 4 && (
          <div className="mt-1 flex flex-wrap gap-2">
            {CHIPS.map((chip, i) => (
              <button
                key={chip.question}
                type="button"
                onClick={() => ask(chip.question)}
                className="animate-srl-pop cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors hover:border-accent"
                style={{
                  backgroundColor: "var(--stage-chip-bg)",
                  borderColor: "var(--stage-chip-border)",
                  animationDelay: `${i * 0.09}s`,
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input — the one call to action */}
      <form
        className="flex gap-2 border-t border-border px-3 py-3"
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
          placeholder="Ask about your pitch deck, your raise, your startup…"
          aria-label="Ask the SRL answer desk a question"
          autoComplete="off"
          className="h-11 min-w-0 flex-1 rounded-[6px] border border-border-strong bg-background px-3.5 text-[15px] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <button
          type="submit"
          disabled={leaving}
          className="flex h-11 shrink-0 cursor-pointer items-center gap-1 rounded-[6px] bg-accent px-5 font-heading text-[15px] font-semibold text-[#09090b] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-70"
        >
          {leaving ? "…" : "Ask"}
          {!leaving && (
            <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
          )}
        </button>
      </form>
    </div>
  );
}
