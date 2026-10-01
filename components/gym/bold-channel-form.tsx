"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { BOLD_CONSENT_TEXT, BOLD_PRIVACY_URL } from "@/lib/bold-lead";

/** Bold's one ask on /built-by-bold. Its own form and consent, never FounderWell's coin. */
export function BoldChannelForm() {
  const [channel, setChannel] = useState("");
  const [email, setEmail] = useState("");
  const [trap, setTrap] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/bold/channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, email, website: trap, consent: true }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Something broke. Try again.");
      setState("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something broke. Try again.");
      setState("error");
    }
  };

  if (state === "sent") {
    return (
      <p className="flex items-center gap-2 text-[17px] font-semibold text-[var(--gym-cyan)]">
        <Check className="h-5 w-5" strokeWidth={3} /> Got it. Marcel will be in touch.
      </p>
    );
  }

  const input =
    "w-full h-12 rounded-xl bg-[var(--gym-night)] border border-[var(--gym-line)] px-4 text-base text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-[var(--gym-cyan)]";

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="sr-only">Your channel or library</span>
          <input value={channel} onChange={(e) => setChannel(e.target.value)} required placeholder="youtube.com/@yourchannel" inputMode="url" className={input} />
        </label>
        <label className="block">
          <span className="sr-only">Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@company.com" className={input} />
        </label>
      </div>
      {/* Honeypot */}
      <input value={trap} onChange={(e) => setTrap(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" name="website" />
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <button
          type="submit"
          disabled={state === "sending"}
          className={cn("gym-button shrink-0 whitespace-nowrap h-12 px-6 rounded-xl text-base uppercase inline-flex items-center justify-center gap-2 cursor-pointer")}
        >
          {state === "sending" ? "Sending…" : "Send your channel"}
          {state !== "sending" && <ArrowRight className="h-4 w-4" strokeWidth={3} />}
        </button>
        <p className="text-[12px] leading-snug text-muted-foreground">
          {BOLD_CONSENT_TEXT}{" "}
          <a href={BOLD_PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            Privacy policy
          </a>
        </p>
      </div>
      {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
    </form>
  );
}
