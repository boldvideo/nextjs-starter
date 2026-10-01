"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { signInWithGoogle } from "@/lib/auth-client";
import { addXp, FREE_PLAYS, markCoin, setStage, sfx, useArcade } from "@/lib/gym-arcade";
import { CONSENT_TEXT, FOUNDERWELL_PRIVACY_URL, STAGES } from "@/lib/gym-lead";
import { track } from "@/lib/gym-track";

/**
 * INSERT COIN: after the free levels, the next one costs an email. The
 * email is FounderWell's lead (consent names FounderWell only); the
 * questions asked so far go with it. No countdown, no fake urgency: the
 * other way out is simply back to start.
 */
export function GymCoinGate({ onInserted, onLeave }: { onInserted: () => void; onLeave: () => void }) {
  const { stage, questions } = useArcade();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    sfx("gameover");
    track("Coin gate shown");
    inputRef.current?.focus();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/gym/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, stage, questions, consent: true }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "The machine jammed. Try again.");
      sfx("coin");
      track("Coin inserted", stage ? { stage } : undefined);
      markCoin();
      addXp(100, "COIN");
      onInserted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The machine jammed. Try again.");
      setState("error");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[75] grid place-items-center overflow-y-auto bg-[rgba(6,3,14,0.88)] backdrop-blur-sm p-4 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="coin-title"
    >
      <div className="gym-pixel-box [--c:var(--gym-yellow)] relative w-full max-w-[520px] bg-[var(--gym-night-2)] px-6 py-7 md:px-9 md:py-9 text-center">
        <p className="font-osd text-[20px] leading-none text-muted-foreground">
          {FREE_PLAYS} FREE LEVELS PLAYED
        </p>
        <h2 id="coin-title" className="mt-3 font-display text-[40px] md:text-[52px] leading-[0.95] gym-chrome">
          Insert coin
        </h2>
        <p className="mt-4 text-[16px] leading-relaxed text-foreground/85">
          Your coin is your email. Keep playing for free, and FounderWell sends you the occasional note on going to market.
        </p>

        <form onSubmit={submit} className="mt-6 text-left">
          {!stage && (
            <div className="mb-4">
              <p className="mb-2 font-osd text-[17px] text-muted-foreground uppercase">Difficulty (optional)</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Your stage">
                {STAGES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={false}
                    onClick={() => setStage(s)}
                    className="h-8 px-3 rounded-full text-[13px] font-semibold border border-[var(--gym-line)] text-foreground/80 hover:border-[var(--gym-yellow)] hover:text-[var(--gym-yellow)] cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          <label htmlFor="coin-email" className="sr-only">
            Email
          </label>
          <div className="gym-neon-frame">
            <div className="flex items-center gap-2 rounded-[calc(1.1rem-2px)] bg-[var(--gym-night)] pl-4 pr-1.5 py-1.5">
              <input
                ref={inputRef}
                id="coin-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="min-w-0 flex-1 bg-transparent h-11 text-base text-foreground placeholder:text-muted-foreground/60 outline-none"
              />
              <button
                type="submit"
                disabled={state === "sending"}
                className="gym-button shrink-0 h-11 px-4 rounded-xl text-sm uppercase inline-flex items-center gap-2 cursor-pointer"
              >
                {state === "sending" ? "…" : "Insert coin"}
                {state !== "sending" && <ArrowRight className="h-4 w-4" strokeWidth={3} />}
              </button>
            </div>
          </div>
          {error && <p className="mt-2 text-sm text-[var(--destructive)]">{error}</p>}
          <p className="mt-3 text-[12px] leading-snug text-muted-foreground">
            {CONSENT_TEXT}{" "}
            <a href={FOUNDERWELL_PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
              Privacy policy
            </a>
          </p>
        </form>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-x-5 gap-y-2 text-sm">
          <button
            type="button"
            onClick={() => signInWithGoogle(window.location.pathname + window.location.search)}
            className="font-semibold text-[var(--gym-cyan)] hover:underline cursor-pointer"
          >
            Have a player card? Sign in
          </button>
          <Link href="/" onClick={onLeave} className={cn("text-muted-foreground hover:text-foreground")}>
            Back to start
          </Link>
        </div>
      </div>
    </div>
  );
}
