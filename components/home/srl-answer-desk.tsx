"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { cn, pickRandom } from "@/lib/utils";
import { PersonaAvatar } from "@/components/persona-avatar";

const FALLBACK_STARTERS = [
  "What kills most pitch decks in the first 30 seconds?",
  "How much should I actually raise for my pre-seed round?",
  "How do I get meetings with investors without warm intros?",
];

interface SrlAnswerDeskProps {
  /** AI identity from the tenant settings — one voice everywhere. */
  aiName: string;
  aiAvatar?: string;
  /** Full conversation-starter pool (settings endpoint); 3 are drawn
      at random on every page load. */
  starters?: string[];
  className?: string;
}

/**
 * The homepage centerpiece, kept deliberately quiet: who's answering
 * (the tenant's configured AI identity), one big input, and three
 * randomly drawn real questions from the show as starters. The real
 * streamed answer happens on /ask.
 */
export function SrlAnswerDesk({
  aiName,
  aiAvatar,
  starters,
  className,
}: SrlAnswerDeskProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [leaving, setLeaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Drawn client-side after mount: fresh set per page load, and the
  // server markup stays deterministic (no hydration mismatch).
  const [picked, setPicked] = useState<string[]>([]);
  useEffect(() => {
    const pool = starters?.length ? starters : FALLBACK_STARTERS;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- random draw must happen client-side only
    setPicked(pickRandom(pool, 3));
  }, [starters]);

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
      {/* Who's answering — the same identity that signs the answers */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3.5 sm:px-5">
        <PersonaAvatar name={aiName} avatar={aiAvatar} size={36} />
        <div className="min-w-0">
          <div className="font-heading text-[15px] font-bold leading-tight">
            {aiName}
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

      <div className="p-4 sm:p-6">
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
            aria-label={`Ask ${aiName} a question`}
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

        {/* Real questions from the show, drawn fresh each visit */}
        <p className="srl-eyebrow mt-7 text-muted-foreground">
          Popular requests
        </p>
        <div className="mt-3 flex min-h-[178px] flex-col gap-2.5">
          {picked.map((question, i) => (
            <button
              key={question}
              type="button"
              title={question}
              onClick={() => ask(question)}
              style={{ animationDelay: `${i * 0.07}s` }}
              className="animate-srl-pop group flex cursor-pointer items-center justify-between gap-3 rounded-[6px] border border-border px-4 py-3.5 text-left text-[15px] text-muted-foreground transition-colors hover:border-accent hover:bg-[var(--signal-soft)] hover:text-foreground"
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
