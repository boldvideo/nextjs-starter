"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/wordmark";
import { askLabel } from "@/lib/utils";
import { useSettings } from "@/components/providers/settings-provider";
import { getPortalConfig } from "@/lib/portal-config";

/**
 * The Taki site bar — slim brand chrome above the portal. Replaces the
 * previous skin's announcement banner + nav stack with a single row:
 * wordmark, a handwritten aside, and the two places to go.
 *
 * Keeps the measurement contract the fixed header frame relies on: the
 * bar writes its real height to --site-bar-height (banner height is 0 —
 * there is no banner in this skin).
 */
export function TakiBar({
  className,
  measure = true,
}: {
  className?: string;
  /** Write the measured chrome heights to the --site-* variables. Off for
      in-flow copies (mobile watch pages) so they don't fight the fixed one. */
  measure?: boolean;
}) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const settings = useSettings();
  const config = getPortalConfig(settings);

  useEffect(() => {
    if (!measure) return;
    const root = document.documentElement;
    const apply = () => {
      root.style.setProperty("--site-banner-height", "0px");
      root.style.setProperty(
        "--site-bar-height",
        `${barRef.current?.offsetHeight ?? 0}px`
      );
    };
    apply();
    const ro = new ResizeObserver(apply);
    if (barRef.current) ro.observe(barRef.current);
    const mq = window.matchMedia("(min-width: 1024px)");
    mq.addEventListener("change", apply);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", apply);
    };
  }, [measure]);

  return (
    <div className={className}>
      <div ref={barRef} className="taki-nav-header">
        <div className="mx-auto flex h-[60px] w-full max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="shrink-0 transition-transform hover:-rotate-1 hover:scale-[1.03]"
          >
            <Wordmark />
          </Link>

          <span
            aria-hidden="true"
            className="font-scribble hidden rotate-[-1.5deg] text-[19px] text-muted-foreground xl:block"
          >
            not a chatbot — a coach with a search bar
          </span>

          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/videos"
              className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-[var(--bg-tertiary)] hover:text-foreground"
            >
              The Library
            </Link>
            <Link
              href="/ask"
              className="rounded-full bg-accent px-3.5 py-1.5 text-sm font-semibold text-accent-foreground shadow-[0_2px_0_rgba(22,21,15,0.25)] transition-all hover:-translate-y-px hover:shadow-[0_3px_0_rgba(22,21,15,0.25)] active:translate-y-0 active:shadow-none"
            >
              {askLabel(config.ai.name)}
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}
