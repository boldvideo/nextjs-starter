"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { setPlayerName, useArcade } from "@/lib/gym-arcade";
import { sharerName } from "@/lib/gym-share";
import { useGymMember } from "./use-gym-member";

/**
 * Shared links say who sent them (?by=Marcel). Signed in, we know the name;
 * otherwise the first share asks once (skipping counts as an answer), and
 * every share after that uses it.
 */
export function useShareName(): {
  /** The name to put on links (null: none) */
  name: string | null;
  /** False until the player is signed in or has answered the prompt once */
  known: boolean;
  remember: (name: string | null) => string | null;
} {
  const { user } = useGymMember();
  const { name: saved } = useArcade();
  const signedIn = sharerName((user?.name || "").split(" ")[0]);
  return {
    name: signedIn ?? sharerName(saved),
    known: signedIn !== null || saved !== null,
    remember: (raw) => {
      const name = sharerName(raw);
      setPlayerName(name ?? "");
      return name;
    },
  };
}

/** `url` with ?by=<name> (or &by=), when there is a name. */
export function withSharer(url: string, name: string | null): string {
  if (!name) return url;
  return `${url}${url.includes("?") ? "&" : "?"}by=${encodeURIComponent(name)}`;
}

/** The one-field prompt: first name, then copy the link (or skip). */
export function GymShareNamePrompt({
  onDone,
  className,
}: {
  onDone: (name: string | null) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onDone(draft);
      }}
      className={cn("flex flex-wrap items-center gap-2 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200", className)}
    >
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Your first name"
        aria-label="Your first name, shown on the shared link"
        maxLength={24}
        className="h-9 w-44 rounded-lg border border-[var(--gym-line)] bg-transparent px-3 text-[14px] text-foreground placeholder:text-muted-foreground/70 focus:border-[var(--gym-pink)] focus:outline-none"
      />
      <button type="submit" className="h-9 px-3.5 rounded-lg bg-[var(--gym-pink)] font-display text-[12px] uppercase text-white hover:brightness-110 cursor-pointer">
        Copy link
      </button>
      <button type="button" onClick={() => onDone(null)} className="h-9 px-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer">
        Skip
      </button>
    </form>
  );
}
