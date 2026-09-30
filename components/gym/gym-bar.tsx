"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Plus, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { signInWithGoogle } from "@/lib/auth-client";
import { useGymMember } from "./use-gym-member";
import { sfx, toggleSound, unlock, useArcade } from "@/lib/gym-arcade";

/**
 * The game's one piece of chrome: logo lockup left; sound, new game and the
 * player card right. Fixed at --header-height (64px) — main pads by it.
 * Click the logo five times fast and the machine tilts.
 */
export function GymBar() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const { sound } = useArcade();
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
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-3 md:gap-5">
          <span className="hidden lg:flex items-center gap-2 font-osd text-[19px] text-muted-foreground">
            <span className="gym-rec inline-block h-2 w-2 rounded-full bg-[var(--gym-pink)] shadow-[0_0_8px_var(--gym-pink)]" />
            FREE PLAY
          </span>
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
              className={cn(
                "inline-flex items-center gap-2 h-10 px-4 md:px-5 rounded-xl",
                "font-display text-[14px] md:text-[15px] tracking-wide",
                "border-2 border-[var(--gym-pink)] text-foreground",
                "shadow-[0_0_18px_-6px_var(--gym-pink)] hover:bg-[var(--gym-pink)] hover:text-[#1a0616] hover:shadow-[0_0_26px_-4px_var(--gym-pink)]",
                "transition-[color,background-color,box-shadow] duration-150 active:scale-95"
              )}
            >
              <Plus className="h-[18px] w-[18px]" strokeWidth={3} />
              <span className="hidden sm:inline">New game</span>
              <span className="sm:hidden">New</span>
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
  return (
    <Link
      href="/player"
      className="group inline-flex items-center gap-2 h-10 pl-1 pr-1 md:pr-3 rounded-full border border-[var(--gym-line)] hover:border-[var(--gym-cyan)] transition-colors"
      aria-label="Your player card"
    >
      {user?.image ? (
        // Google avatar: tiny, remote, not worth next/image config
        <img src={user.image} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full ring-2 ring-[var(--gym-pink)]" />
      ) : (
        <span className="h-8 w-8 rounded-full grid place-items-center gym-sunset-bg font-display text-[13px] text-[#1a0616]">
          {first.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="hidden md:inline text-sm font-semibold text-foreground/90 group-hover:text-[var(--gym-cyan)]">{first}</span>
    </Link>
  );
}
