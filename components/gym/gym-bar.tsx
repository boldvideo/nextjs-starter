"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The gym's one piece of chrome: logo lockup left, "open 24/7" OSD and a
 * new-set button right. Fixed at --header-height (64px) — main pads by it.
 */
export function GymBar() {
  const pathname = usePathname();
  const onHome = pathname === "/";

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-[var(--header-height)] bg-[color-mix(in_srgb,var(--gym-night)_82%,transparent)] backdrop-blur-md">
      <div className="h-full max-w-[1440px] mx-auto px-4 md:px-6 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 min-w-0 group" aria-label="The GTM Gym — home">
          <Image
            src="/gym/logo.webp"
            alt=""
            width={44}
            height={44}
            priority
            className="h-11 w-11 shrink-0 transition-transform duration-200 ease-out group-hover:-rotate-6 group-hover:scale-105"
          />
          <span className="flex flex-col leading-none min-w-0">
            <span className="font-display text-[17px] md:text-[19px] gym-sunset-text whitespace-nowrap">
              The GTM Gym
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
          <span className="hidden sm:flex items-center gap-2 font-osd text-[19px] text-muted-foreground">
            <span className="gym-rec inline-block h-2 w-2 rounded-full bg-[var(--gym-pink)] shadow-[0_0_8px_var(--gym-pink)]" />
            OPEN 24/7
          </span>
          {!onHome && (
            <Link
              href="/"
              className={cn(
                "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg",
                "font-display text-[13px] tracking-wide",
                "border border-[var(--gym-line)] text-foreground/90",
                "hover:border-[var(--gym-cyan)] hover:text-[var(--gym-cyan)] hover:shadow-[0_0_18px_-4px_var(--gym-cyan)]",
                "transition-[color,border-color,box-shadow] duration-150"
              )}
            >
              <Plus className="h-4 w-4" strokeWidth={3} />
              New set
            </Link>
          )}
        </div>
      </div>
      {/* Sunset hairline */}
      <div className="absolute inset-x-0 bottom-0 h-px gym-sunset-bg opacity-60" />
    </header>
  );
}
