"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Dices } from "lucide-react";
import { cn } from "@/lib/utils";
import { GymHorizon } from "./gym-backdrop";
import { useGymMember } from "./use-gym-member";
import { GymNoteSticker } from "./gym-founder-note";
import { sfx, unlock } from "@/lib/gym-arcade";
import {
  GYM_PLACEHOLDERS,
  GYM_RANDOM_REPS,
  GYM_WORKOUTS,
  type GymWorkout,
} from "./gym-workouts";

const TONE: Record<GymWorkout["tone"], { text: string; hover: string }> = {
  pink: {
    text: "text-[var(--gym-pink)]",
    hover: "hover:border-[var(--gym-pink)] hover:shadow-[0_0_32px_-8px_var(--gym-pink)]",
  },
  cyan: {
    text: "text-[var(--gym-cyan)]",
    hover: "hover:border-[var(--gym-cyan)] hover:shadow-[0_0_32px_-8px_var(--gym-cyan)]",
  },
  orange: {
    text: "text-[var(--gym-orange)]",
    hover: "hover:border-[var(--gym-orange)] hover:shadow-[0_0_32px_-8px_var(--gym-orange)]",
  },
  yellow: {
    text: "text-[var(--gym-yellow)]",
    hover: "hover:border-[var(--gym-yellow)] hover:shadow-[0_0_32px_-8px_var(--gym-yellow)]",
  },
};

/** Types, holds, deletes, next: the placeholder riffs while you think. */
function useTypewriter(lines: string[], enabled: boolean): string {
  const [text, setText] = useState(lines[0] ?? "");

  useEffect(() => {
    if (!enabled || lines.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let line = 0;
    let chars = lines[0].length;
    let deleting = true;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (deleting) {
        chars -= 1;
        if (chars <= 0) {
          deleting = false;
          line = (line + 1) % lines.length;
        }
      } else {
        chars += 1;
      }
      const target = lines[line];
      setText(target.slice(0, Math.max(0, chars)));

      if (!deleting && chars >= target.length) {
        deleting = true;
        timer = setTimeout(tick, 1800);
        return;
      }
      timer = setTimeout(tick, deleting ? 22 : 48 + Math.random() * 40);
    };

    timer = setTimeout(tick, 2200);
    return () => clearTimeout(timer);
  }, [lines, enabled]);

  return text;
}

interface GymAskHeroProps {
  sessions?: number;
  /** Optional submit override (the /ask page streams in place) */
  onAsk?: (question: string) => void;
}

export function GymAskHero({ sessions, onAsk }: GymAskHeroProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [lifting, setLifting] = useState(false);
  const [nudge, setNudge] = useState(0);
  const placeholder = useTypewriter(GYM_PLACEHOLDERS, query.length === 0);
  const { user, member } = useGymMember();
  const first = (user?.name || "").split(" ")[0];
  const company = member?.profile?.business_name;
  const greeting = first
    ? `Welcome back, ${first}. What's your next move${company ? ` at ${company}` : ""}?`
    : "Player one, ready? What's your next move?";

  const ask = useCallback(
    (question: string) => {
      const q = question.trim();
      if (lifting) return;
      if (!q) {
        inputRef.current?.focus();
        setNudge((n) => n + 1);
        return;
      }
      setLifting(true);
      sfx("start");
      if (onAsk) {
        onAsk(q);
        return;
      }
      router.push(`/ask?q=${encodeURIComponent(q)}`);
    },
    [lifting, onAsk, router]
  );

  const rollDice = useCallback(() => {
    const pick = GYM_RANDOM_REPS[Math.floor(Math.random() * GYM_RANDOM_REPS.length)];
    setQuery(pick);
    inputRef.current?.focus();
    sfx("select");
    unlock("random");
  }, []);

  // "/" jumps to the bar from anywhere on the page
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || document.activeElement === inputRef.current) return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative w-full max-w-[960px] mx-auto flex flex-col items-center text-center">
      {/* The game master waves you over */}
      <div className="relative z-10 flex items-end gap-3 mb-4 md:mb-5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
        <div className="relative shrink-0">
          <Image
            src="/gym/game/game-master-bot.webp"
            alt="The GTM Game master"
            width={76}
            height={76}
            priority
            className="h-[60px] w-[60px] md:h-[76px] md:w-[76px] drop-shadow-[0_0_18px_rgba(255,46,166,0.55)]"
          />
        </div>
        <div className="relative mb-3 max-w-[340px] md:max-w-none rounded-2xl rounded-bl-md bg-[var(--gym-chalk)] text-[#1a0a2e] px-4 py-2.5 text-left text-[15px] md:text-base font-semibold leading-snug shadow-[4px_4px_0_var(--gym-pink)]">
          {greeting}
        </div>
      </div>

      <div className="relative w-full">
        <GymHorizon />
        {/* "Psst." What this is and who FounderWell is. Opens Vanessa's note. */}
        <GymNoteSticker className="absolute z-20 -bottom-14 right-1 h-[68px] w-[68px] md:bottom-auto md:-top-16 md:-right-12 lg:-right-20 md:h-[96px] md:w-[96px] rotate-6" />
        <h1 className="relative font-display gym-chrome uppercase leading-[0.92] text-[48px] sm:text-[clamp(40px,7vw,96px)] tracking-[-0.02em] pb-[0.3em]">
          <span className="block sm:whitespace-nowrap text-balance">Stuck on GTM?</span>
          <span className="block sm:whitespace-nowrap text-balance">Ask the coaches.</span>
        </h1>
        {/* Sticker riding the horizon line */}
        <div className="absolute left-1/2 bottom-[18%] -translate-x-1/2 translate-y-[125%] z-10">
          <div className="-rotate-2 inline-flex items-center gap-2 rounded-md bg-[var(--gym-chalk)] pl-2.5 pr-3 py-1.5 shadow-[3px_3px_0_var(--gym-cyan),0_0_30px_-4px_rgba(34,230,255,0.6)] whitespace-nowrap">
            <span className="font-osd text-[18px] leading-none text-[#5b4a7a]">by</span>
            <Image
              src="/gym/founderwell-mark-teal.svg"
              alt=""
              width={18}
              height={18}
              className="h-[18px] w-[18px]"
            />
            <span className="font-display text-[15px] md:text-[17px] leading-none text-[#0F4267] tracking-tight">
              FounderWell
            </span>
          </div>
        </div>
      </div>


      {/* The input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(query);
        }}
        key={nudge}
        className={cn("relative z-10 mt-14 md:mt-16 w-full gym-neon-frame", nudge > 0 && "gym-nudge")}
      >
        <div className="flex items-center gap-2 rounded-[calc(1.1rem-2px)] bg-[var(--gym-night-2)] pl-4 md:pl-6 pr-1.5 md:pr-2 py-1.5 md:py-2">
          <label htmlFor="gym-ask" className="sr-only">
            Ask the game master
          </label>
          <input
            ref={inputRef}
            id="gym-ask"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent h-12 md:h-14 text-lg md:text-xl text-foreground placeholder:text-muted-foreground/70 outline-none"
          />
          <button
            type="button"
            onClick={rollDice}
            title="Random level"
            aria-label="Random level"
            className="shrink-0 h-10 w-9 md:h-12 md:w-12 grid place-items-center rounded-xl text-muted-foreground hover:text-[var(--gym-yellow)] hover:bg-white/5 transition-[color,background-color,transform] duration-150 active:rotate-45 cursor-pointer"
          >
            <Dices className="h-5 w-5" />
          </button>
          <button
            type="submit"
            disabled={lifting}
            className="gym-button shrink-0 h-11 md:h-14 px-3.5 md:px-6 rounded-xl text-[15px] md:text-lg uppercase inline-flex items-center gap-2 cursor-pointer"
          >
            {lifting ? "Loading…" : "Press start"}
            {!lifting && <ArrowRight className="hidden sm:block h-5 w-5" strokeWidth={3} />}
          </button>
        </div>
      </form>

      {/* Proof before anything else: the actual humans behind the answers */}
      <div className="relative z-10 mt-5 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
        <span className="flex -space-x-2.5">
          {["cameron", "drew", "joel", "vanessa"].map((slug) => (
            <Image key={slug} src={`/gym/game/cast/${slug}.webp`} alt="" width={44} height={44} className="h-10 w-10 md:h-11 md:w-11" />
          ))}
        </span>
        <span className="text-center sm:text-left text-[13.5px] md:text-sm leading-snug text-muted-foreground">
          <span className="font-semibold text-foreground">Cameron, Drew, Joel</span> &amp; the FounderWell crew.
          <br />
          Actual humans. We checked.
        </span>
      </div>

      {/* World 1 */}
      <div className="relative z-10 mt-6 md:mt-7 w-full">
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="h-px w-10 bg-[var(--gym-line)]" />
          <span className="font-osd text-[19px] text-muted-foreground uppercase">
            Choose your level
          </span>
          <span className="h-px w-10 bg-[var(--gym-line)]" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
          {GYM_WORKOUTS.map((w, i) => (
            <button
              key={w.label}
              type="button"
              onClick={() => ask(w.question)}
              onMouseEnter={() => sfx("select")}
              style={{ animationDelay: `${120 + i * 70}ms` }}
              className={cn(
                "group relative text-left rounded-xl p-3.5 md:p-4 cursor-pointer",
                "bg-[color-mix(in_srgb,var(--gym-panel)_90%,transparent)]",
                "border border-[var(--gym-line)]",
                "transition-[border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0",
                "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-500 motion-safe:fill-mode-both",
                TONE[w.tone].hover
              )}
            >
              <div className="flex flex-col-reverse items-start gap-0.5 lg:flex-row lg:items-baseline lg:justify-between lg:gap-2">
                <span className={cn("font-display text-[15px] md:text-base uppercase whitespace-nowrap", TONE[w.tone].text)}>
                  {w.label}
                </span>
                <span className="font-osd text-[15px] leading-none text-muted-foreground/80 uppercase">
                  {w.topic}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold leading-snug text-foreground/95 line-clamp-2 group-hover:text-foreground">
                {w.question}
              </p>
            </button>
          ))}
        </div>
        {sessions ? (
          <p className="mt-4 font-osd text-[17px] text-muted-foreground/70">
            {sessions} sessions loaded · press <kbd className="px-1 rounded border border-[var(--gym-line)] text-foreground/80">/</kbd> to play
          </p>
        ) : null}
      </div>
    </div>
  );
}
