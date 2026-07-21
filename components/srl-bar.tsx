"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Sun, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/components/providers/settings-provider";
import { useSearch } from "@/components/providers/search-provider";

/**
 * The startups.com site bar — one fixed 68px nav, measured off the live
 * site: translucent frame color under a 20px blur, the red logo box with
 * the color-mode toggle beside it, tracked-out caps links (declared 900
 * on their site but rendered 700 — only four Poppins faces load) with
 * a 3px orange underline on the active item, and a quiet outlined link
 * back to startups.com on the right.
 *
 * Keeps the measurement contract the panel chrome relies on: the bar
 * writes its real height to --site-bar-height.
 */
export function SrlBar({
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
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const { setIsOpen: setSearchOpen } = useSearch();
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- next-themes hydration guard
  useEffect(() => setMounted(true), []);

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
    return () => ro.disconnect();
  }, [measure]);

  const logoSrc = settings?.logoUrl || "/startups-wordmark.svg";

  // No "Ask" item: the homepage desk IS the ask surface — /ask exists
  // as the conversation page you land on, not as a nav destination.
  const navItems = [
    { label: "Home", href: "/" },
    { label: "Episodes", href: "/videos" },
  ];
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : (pathname ?? "").startsWith(href);

  return (
    <div className={className}>
      <div ref={barRef} className="srl-nav-header">
        <div className="flex h-[68px] w-full items-center gap-3 pl-4 pr-3 sm:gap-4 sm:pl-5 sm:pr-4">
          {/* Logo box + color-mode toggle, their exact left cluster */}
          <Link
            href="/"
            className="shrink-0 transition-opacity hover:opacity-90"
            aria-label="SRL home"
          >
            <Image
              src={logoSrc}
              alt="startups.com"
              width={140}
              height={40}
              priority
              className="h-9 w-auto sm:h-10"
            />
          </Link>
          <button
            type="button"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
            aria-label="Toggle color mode"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[5.25px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {mounted && resolvedTheme === "light" ? (
              <Sun className="h-4 w-4" strokeWidth={2.25} />
            ) : (
              <Moon className="h-4 w-4" strokeWidth={2.25} />
            )}
          </button>

          {/* Center nav — 12px/700, 1.5px tracking, active gets the 3px
              orange underline pulled down to the bar's bottom edge */}
          <nav className="absolute left-1/2 hidden h-full -translate-x-1/2 items-center gap-8 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "srl-nav-link relative flex h-full items-center transition-colors",
                  !isActive(item.href) && "text-foreground/90 hover:text-foreground"
                )}
                style={
                  isActive(item.href)
                    ? { color: "var(--accent-active)" }
                    : undefined
                }
              >
                {item.label}
                {isActive(item.href) && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-[3px] rounded-t-full"
                    style={{ background: "var(--accent-active)" }}
                  />
                )}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            {/* On small screens the center nav collapses into the right
                cluster so Episodes stays one tap away */}
            <nav className="flex items-center gap-4 pr-1 md:hidden">
              {navItems
                .filter((item) => item.href !== "/")
                .map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "srl-nav-link transition-colors",
                      !isActive(item.href) &&
                        "text-foreground/90 hover:text-foreground"
                    )}
                    style={
                      isActive(item.href)
                        ? { color: "var(--accent-active)" }
                        : undefined
                    }
                  >
                    {item.label}
                  </Link>
                ))}
            </nav>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search episodes"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[5.25px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Search className="h-4 w-4" strokeWidth={2.25} />
            </button>
            <a
              href="https://www.startups.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center rounded-[5.25px] border border-border-strong px-3.5 text-sm font-medium leading-none text-foreground transition-colors hover:bg-muted sm:flex sm:h-10"
            >
              Startups.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
