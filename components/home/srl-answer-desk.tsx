"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const HOSTS = [
  { initials: "EK", name: "Ed Kang", color: "#c65a3f" },
  { initials: "WS", name: "Wil Schroter", color: "#4a47a3" },
  { initials: "RR", name: "Ryan Rutan", color: "#2e8f7b" },
];

const STARTERS = [
  "What kills most pitch decks in the first 30 seconds?",
  "How much should I actually raise for my pre-seed round?",
  "How do I get meetings with investors without warm intros?",
];

/**
 * The homepage centerpiece, kept deliberately quiet: who you're asking
 * (the three hosts), one big input, and three real questions from the
 * show as starters. No scripted theatre — the first answer is the show.
 * Submitting hands off to /ask for the streamed answer.
 */
export function SrlAnswerDesk({ className }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [leaving, setLeaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
        "overflow-hidden rounded-lg border border-border bg-surface text-left",
        "shadow-[0_1px_2px_var(--shadow),0_24px_56px_-24px_var(--shadow)]",
        className
      )}
    >
      {/* Who's answering */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
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
            every episode in memory · answers with receipts
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {/* The one action */}
        <form
          className="flex gap-2"
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
            className="h-[52px] min-w-0 flex-1 rounded-[6px] border border-border-strong bg-background px-4 text-[15px] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
          <button
            type="submit"
            disabled={leaving}
            className="flex h-[52px] shrink-0 cursor-pointer items-center gap-1 rounded-[6px] bg-accent px-5 font-heading text-[15px] font-semibold text-[#09090b] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-70 sm:px-6"
          >
            {leaving ? "…" : "Ask"}
            {!leaving && <ChevronRight className="h-4 w-4" strokeWidth={2.5} />}
          </button>
        </form>

        {/* Real questions from the show, as starters */}
        <p className="srl-eyebrow mt-6 text-muted-foreground">
          Popular requests
        </p>
        <div className="mt-2.5 flex flex-col gap-2">
          {STARTERS.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => ask(question)}
              className="group flex cursor-pointer items-center justify-between gap-3 rounded-[6px] border border-border px-4 py-3 text-left text-[15px] text-muted-foreground transition-colors hover:border-accent hover:bg-[var(--signal-soft)] hover:text-foreground"
            >
              <span className="min-w-0 flex-1 truncate">{question}</span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-foreground" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
