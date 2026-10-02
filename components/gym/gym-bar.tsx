"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { IdCard, LogOut, Plus, ScrollText, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { logOut, signInWithGoogle } from "@/lib/auth-client";
import { useGymMember } from "./use-gym-member";
import { hasDodger, openDodger, sfx, toggleSound, unlock, useArcade } from "@/lib/gym-arcade";

/**
 * The game's one piece of chrome: logo lockup left; quests, sound, new game
 * and the player card right. Fixed at --header-height (64px) — main pads by
 * it. Click the logo five times fast and the machine tilts. Once the Konami
 * code has been entered (or the player ranked up to Closer), FREE PLAY
 * becomes the way back into the secret level.
 */
export function GymBar() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const arcade = useArcade();
  const { sound } = arcade;
  const dodger = hasDodger(arcade);
  const openQuests = arcade.quests.filter((q) => q.status !== "done").length;
  const [tilt, setTilt] = useState(0);
  const clicks = useRef<number[]>([]);

  const onLogo = () => {
    const now = Date.now();
    clicks.current = [...clicks.current.filter((t) => now - t < 1500), now];
    if (clicks.current.length >= 5) {
      clicks.current = [];
      setTilt((n) => n + 1);
      sfx("hit");
      unlock("tilt");
    }
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-[var(--header-height)] bg-[var(--gym-night)]">
      <div className="h-full max-w-[1440px] mx-auto px-4 md:px-6 flex items-center justify-between gap-4">
        <Link href="/" onClick={onLogo} className="flex items-center gap-3 min-w-0 group" aria-label="The GTM Game — home">
          <Image
            src="/gym/game/logo.webp"
            alt=""
            width={44}
            height={44}
            priority
            key={tilt}
            className={cn(
              "h-11 w-11 shrink-0 transition-transform duration-200 ease-out group-hover:-rotate-6 group-hover:scale-105",
              tilt > 0 && "gym-tilt"
            )}
          />
          <span className="flex flex-col leading-none min-w-0">
            <span className="font-display text-[17px] md:text-[19px] gym-sunset-text whitespace-nowrap">
              The GTM Game
            </span>
            <span className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground whitespace-nowrap">
              by
              <Image
                src="/gym/founderwell-mark.svg"
                alt=""
                width={12}
                height={12}
                className="h-3 w-3 opacity-80 invert"
              />
              <span className="text-foreground/80">FounderWell</span>
              <span className="hidden sm:inline text-muted-foreground/70">· built by</span>
              <span className="hidden sm:inline font-mono font-semibold tracking-[0.08em] text-foreground/80">BOLD</span>
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-3 md:gap-5">
          {dodger ? (
            // Found the code once (or earned it): the secret level stays one click away in this browser
            <button
              type="button"
              onClick={openDodger}
              className="hidden md:flex items-center gap-2 font-osd text-[19px] text-[var(--gym-yellow)] hover:text-white cursor-pointer"
            >
              <span className="gym-blink">▶</span>
              SECRET LEVEL
            </button>
          ) : (
            <span className="hidden lg:flex items-center gap-2 font-osd text-[19px] text-muted-foreground">
              <span className="gym-rec inline-block h-2 w-2 rounded-full bg-[var(--gym-pink)] shadow-[0_0_8px_var(--gym-pink)]" />
              FREE PLAY
            </span>
          )}
          <Link
            href="/quests"
            aria-label={openQuests ? `Your quests (${openQuests} open)` : "Your quests"}
            title="Your quests"
            className={cn(
              "relative h-10 w-10 grid place-items-center rounded-xl border transition-colors",
              pathname === "/quests"
                ? "border-[var(--gym-yellow)] text-[var(--gym-yellow)]"
                : "border-[var(--gym-line)] text-muted-foreground hover:text-[var(--gym-yellow)] hover:border-[var(--gym-yellow)]"
            )}
          >
            <ScrollText className="h-[18px] w-[18px]" />
            {openQuests > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 grid place-items-center rounded-full bg-[var(--gym-yellow)] font-display text-[10px] leading-none text-[#1a0616] tabular-nums">
                {openQuests}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={sound}
            aria-label={sound ? "Mute sound" : "Turn sound on"}
            title={sound ? "Sound on" : "Sound off"}
            className={cn(
              "h-10 w-10 place-items-center rounded-xl border transition-colors cursor-pointer",
              onHome ? "grid" : "hidden sm:grid",
              sound
                ? "border-[var(--gym-cyan)] text-[var(--gym-cyan)] shadow-[0_0_16px_-6px_var(--gym-cyan)]"
                : "border-[var(--gym-line)] text-muted-foreground hover:text-foreground"
            )}
          >
            {sound ? <Volume2 className="h-[18px] w-[18px]" /> : <VolumeX className="h-[18px] w-[18px]" />}
          </button>
          {!onHome && (
            <Link
              href="/"
              aria-label="New game"
              className={cn(
                "inline-flex items-center justify-center gap-2 h-10 w-10 sm:w-auto sm:px-4 md:px-5 rounded-xl",
                "font-display text-[14px] md:text-[15px] tracking-wide",
                "border-2 border-[var(--gym-pink)] text-foreground",
                "shadow-[0_0_18px_-6px_var(--gym-pink)] hover:bg-[var(--gym-pink)] hover:text-[#1a0616] hover:shadow-[0_0_26px_-4px_var(--gym-pink)]",
                "transition-[color,background-color,box-shadow] duration-150 active:scale-95"
              )}
            >
              <Plus className="h-[18px] w-[18px]" strokeWidth={3} />
              <span className="hidden sm:inline">New game</span>
            </Link>
          )}
          <MemberButton />
        </div>
      </div>
      {/* Sunset hairline */}
      <div className="absolute inset-x-0 bottom-0 h-px gym-sunset-bg opacity-60" />
    </header>
  );
}

/** Sign in (Google) when signed out; the player's face → their card when in. */
function MemberButton() {
  const { isPending, signedIn, user } = useGymMember();
  if (isPending) return <span className="h-10 w-10" aria-hidden />;

  if (!signedIn) {
    return (
      <button
        type="button"
        onClick={() => signInWithGoogle("/player")}
        className="inline-flex items-center gap-2 h-10 px-3 md:px-4 rounded-xl text-sm font-semibold text-foreground/90 border border-[var(--gym-line)] hover:border-[var(--gym-cyan)] hover:text-[var(--gym-cyan)] transition-colors cursor-pointer"
      >
        <span className="hidden sm:inline">Player card</span>
        <span className="sm:hidden">Join</span>
      </button>
    );
  }

  const first = (user?.name || user?.email || "").split(/[ @]/)[0];
  return <MemberMenu first={first} image={user?.image ?? null} />;
}

/** The player's face opens a tiny menu: their card, or log out. */
function MemberMenu({ first, image }: { first: string; image: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const item =
    "flex w-full items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm font-semibold text-foreground/90 hover:bg-white/[0.06] hover:text-foreground cursor-pointer";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Your player menu"
        className="group inline-flex items-center gap-2 h-10 pl-1 pr-1 md:pr-3 rounded-full border border-[var(--gym-line)] hover:border-[var(--gym-cyan)] transition-colors cursor-pointer"
      >
        {image ? (
          // Google avatar: tiny, remote, not worth next/image config
          <img src={image} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full ring-2 ring-[var(--gym-pink)]" />
        ) : (
          <span className="h-8 w-8 rounded-full grid place-items-center gym-sunset-bg font-display text-[13px] text-[#1a0616]">
            {first.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="hidden md:inline text-sm font-semibold text-foreground/90 group-hover:text-[var(--gym-cyan)]">{first}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-48 rounded-xl border border-[var(--gym-line)] bg-[var(--gym-night-2)] p-1.5 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.8)] motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-150"
        >
          <Link href="/player" role="menuitem" onClick={() => setOpen(false)} className={item}>
            <IdCard className="h-4 w-4" />
            Player card
          </Link>
          <Link href="/quests" role="menuitem" onClick={() => setOpen(false)} className={item}>
            <ScrollText className="h-4 w-4" />
            Your quests
          </Link>
          <button type="button" role="menuitem" onClick={() => logOut()} className={item}>
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
