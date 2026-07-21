"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CircleDollarSign,
  Presentation,
  Users,
  Handshake,
  Rocket,
  Lightbulb,
  PencilLine,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SrlRequestDeskProps {
  videoCount: number | null;
  className?: string;
}

/**
 * The homepage centerpiece: startups.com's "Create a Request" wizard,
 * rebuilt as a live answer desk. Goal cards on the left (their exact
 * grammar — icon tiles, "Or, Define Your Own Goal" row), and on the
 * right the show itself: a scripted hello in the purple stage panel,
 * an input, and their "Let's Get This Done" CTA. Submitting hands off
 * to /ask for the real streamed answer.
 */
const GOALS = [
  {
    key: "raise",
    label: "Raise Funding",
    icon: CircleDollarSign,
    question: "How much should I actually raise for my pre-seed round?",
  },
  {
    key: "deck",
    label: "Fix My Pitch Deck",
    icon: Presentation,
    question:
      "What are the biggest mistakes founders make in their pitch decks?",
  },
  {
    key: "customers",
    label: "Get Customers",
    icon: Users,
    question: "How do I land my first paying customers before I have a brand?",
  },
  {
    key: "investors",
    label: "Meet Investors",
    icon: Handshake,
    question: "How do I get meetings with investors without warm intros?",
  },
  {
    key: "gtm",
    label: "Nail My Go-To-Market",
    icon: Rocket,
    question: "How should an early-stage startup think about go-to-market?",
  },
  {
    key: "validate",
    label: "Validate My Idea",
    icon: Lightbulb,
    question: "How do I know if my startup idea is actually worth building?",
  },
];

type ScriptStep = 0 | 1 | 2 | 3 | 4;
// 0: idle · 1: typing · 2: msg1 · 3: typing · 4: msg2 + ready

const HOSTS = [
  { initials: "EK", name: "Ed Kang", color: "#c65a3f" },
  { initials: "WS", name: "Wil Schroter", color: "#4a47a3" },
  { initials: "RR", name: "Ryan Rutan", color: "#2e8f7b" },
];

export function SrlRequestDesk({ videoCount, className }: SrlRequestDeskProps) {
  const router = useRouter();
  const [step, setStep] = useState<ScriptStep>(0);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const messages = [
    "You're on. This is the SRL request line — every episode, every pitch deck teardown, in one place.",
    videoCount
      ? `Pick a goal, or type your own. I'll pull the exact moments Ed, Wil & Ryan covered it — across all ${videoCount} full shows.`
      : "Pick a goal, or type your own. I'll pull the exact moments Ed, Wil & Ryan covered it on the show.",
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

  const pickGoal = (key: string, question: string) => {
    setSelected(key);
    setQuery(question);
    inputRef.current?.focus();
  };

  return (
    <div
      className={cn(
        "grid overflow-hidden rounded-lg border border-border bg-surface text-left",
        "shadow-[0_1px_2px_var(--shadow),0_24px_56px_-24px_var(--shadow)]",
        "lg:grid-cols-[1fr_1.08fr]",
        className
      )}
    >
      {/* ── Goal picker — their "Create a Request" column ─────────── */}
      <div className="order-2 border-t border-border p-5 sm:p-7 lg:order-1 lg:border-r lg:border-t-0">
        <p className="srl-eyebrow text-muted-foreground">Make a Request</p>
        <h2 className="mt-4 border-b border-border pb-4 font-heading text-lg font-bold">
          What do you want to accomplish?
        </h2>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {GOALS.map((goal) => (
            <button
              key={goal.key}
              type="button"
              aria-pressed={selected === goal.key}
              data-selected={selected === goal.key}
              onClick={() => pickGoal(goal.key, goal.question)}
              className="srl-goal-card flex cursor-pointer flex-col items-center justify-center gap-2.5 px-2 py-4 text-center"
            >
              <goal.icon
                className={cn(
                  "h-[22px] w-[22px]",
                  selected === goal.key
                    ? "text-[var(--accent-active)]"
                    : "text-muted-foreground"
                )}
                strokeWidth={1.75}
              />
              <span className="text-[13px] font-medium leading-tight text-muted-foreground sm:text-sm">
                {goal.label}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            setSelected(null);
            setQuery("");
            inputRef.current?.focus();
          }}
          className="mt-3 flex h-11 w-full cursor-pointer items-center justify-center gap-2.5 rounded-[5.25px] border border-border-strong text-[15px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <PencilLine className="h-4 w-4" strokeWidth={1.75} />
          Or, Define Your Own Goal
        </button>
      </div>

      {/* ── The stage — scripted hello + handoff to /ask ──────────── */}
      <div
        className="order-1 flex flex-col gap-4 p-5 sm:p-6 lg:order-2"
        style={{ backgroundColor: "var(--stage)" }}
      >
        <div
          className="flex h-[248px] flex-col overflow-hidden rounded-lg sm:h-[272px]"
          style={{
            backgroundColor: "var(--stage-panel)",
            color: "var(--stage-panel-foreground)",
          }}
        >
          {/* Desk header: the three hosts + status */}
          <div className="flex items-center gap-3 px-4 pb-3 pt-4">
            <div className="flex -space-x-2">
              {HOSTS.map((host) => (
                <span
                  key={host.initials}
                  title={host.name}
                  className="flex h-8 w-8 items-center justify-center rounded-full font-heading text-[11px] font-bold text-white ring-2"
                  style={
                    {
                      backgroundColor: host.color,
                      "--tw-ring-color": "var(--stage-panel)",
                    } as React.CSSProperties
                  }
                >
                  {host.initials}
                </span>
              ))}
            </div>
            <div className="min-w-0">
              <div className="font-heading text-[14px] font-bold leading-tight">
                The SRL Answer Desk
              </div>
              <div className="flex items-center gap-1.5 text-xs opacity-75">
                <span
                  aria-hidden="true"
                  className="h-[7px] w-[7px] rounded-full"
                  style={{ backgroundColor: "var(--success)" }}
                />
                always on · answers with receipts
              </div>
            </div>
          </div>

          {/* Conversation */}
          <div
            role="log"
            aria-live="polite"
            className="no-scrollbar flex flex-1 flex-col items-start gap-2.5 overflow-y-auto px-4 pb-4"
          >
            {messages.slice(0, step >= 4 ? 2 : step >= 2 ? 1 : 0).map((m) => (
              <div
                key={m}
                className="animate-srl-pop max-w-[92%] rounded-lg rounded-bl-[4px] px-3.5 py-2.5 text-[14px] leading-relaxed"
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
          </div>
        </div>

        {/* Input + their CTA */}
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            ask(query);
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (selected) setSelected(null);
            }}
            placeholder="Type your request…"
            aria-label="Ask the SRL answer desk a question"
            autoComplete="off"
            className="h-11 w-full rounded-[6px] border border-border-strong px-3.5 text-[15px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-accent focus:ring-2 focus:ring-accent/30"
            style={{ backgroundColor: "var(--stage-input)" }}
          />
          <button
            type="submit"
            disabled={leaving}
            className="flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-[6px] bg-accent font-heading text-[16px] font-semibold text-[#09090b] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-70"
          >
            {leaving ? "Pulling up the moments…" : "Let's Get This Done"}
            {!leaving && <ChevronRight className="h-[18px] w-[18px]" strokeWidth={2.5} />}
          </button>
        </form>
      </div>
    </div>
  );
}
