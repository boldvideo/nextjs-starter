"use client";
import { Suspense } from "react";
import type { StaticImageData } from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { askLabel } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import UserMenu from "@/components/auth/user-menu";
import { HeaderSearch } from "@/components/header-search";
import { TakiBar } from "@/components/taki-bar";
import { MobileSearchButton } from "@/components/mobile-search-button";
import { MobileAskButton } from "@/components/mobile-ask-button";
import { useSettings } from "@/components/providers/settings-provider";
import { useBreadcrumb } from "@/components/providers/breadcrumb-provider";
import { getPortalConfig } from "@/lib/portal-config";
import type { Session } from "next-auth";

interface HeaderProps {
  logo?: StaticImageData | string;
  logoDark?: string;
  menuItems: Array<{ url: string; label: string; blank?: boolean }>;
  session?: Session | null;
  className?: string;
}

export function Header({ menuItems, session, className }: HeaderProps) {
  const settings = useSettings();
  const config = getPortalConfig(settings);
  const pathname = usePathname();
  const { label: pageCrumb } = useBreadcrumb();

  // Subtle "Library / …" breadcrumb on non-library pages. Pages can publish
  // their own label (e.g. the video title) via <Breadcrumb />.
  const crumbLabel =
    pageCrumb ??
    (pathname?.startsWith("/ask")
      ? askLabel(config.ai.name)
      : pathname === "/s"
        ? "Search"
        : pathname === "/videos"
          ? "All videos"
          : null);

  // The homepage carries its own hero — the Taki bar is the only fixed
  // chrome there. Other pages keep the portal nav row.
  const isHome = pathname === "/";

  // Watch pages on mobile scroll as one document (chrome included, like
  // humanlayer.com itself) — the fixed header steps aside entirely there
  // and the video layout renders the chrome in-flow instead.
  const isWatch =
    /^\/(v|e)\//.test(pathname ?? "") ||
    /^\/pl\/[^/]+\/v\//.test(pathname ?? "");

  return (
    <>
      {isHome && (
        <style>{`:root { --header-height: calc(var(--site-banner-height) + var(--site-bar-height)); }`}</style>
      )}
      {isWatch && (
        <style>{`@media (max-width: 1023.98px) { :root { --header-height: 0px; } }`}</style>
      )}
      <header
        className={`fixed top-0 w-full z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border transition-all h-[var(--header-height)] flex-col ${
          isWatch ? "hidden lg:flex" : "flex"
        } ${className || ""}`}
      >
        {/* Taki brand bar rides on top of the portal chrome */}
        <TakiBar />
        {!isHome && (
        // Portal nav row sits in the same 1280px frame as their nav-container
        <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 flex-1 flex items-center">
          <nav className="w-full flex flex-col lg:flex-row gap-4 lg:gap-0">
            <div className="flex items-center justify-between w-full">
              {/* Left: breadcrumb (the TakiBar above already carries the
                  wordmark — repeating it here reads as a stutter) */}
              <div className="flex items-center">
                {/* Breadcrumb */}
                {crumbLabel && (
                  <div className="hidden lg:flex items-center gap-2 text-sm mr-6">
                    <Link
                      href="/"
                      className="text-muted-foreground/70 hover:text-primary transition-colors"
                    >
                      Library
                    </Link>
                    <span className="text-muted-foreground/40">/</span>
                    <span className="text-muted-foreground max-w-[320px] truncate">
                      {crumbLabel}
                    </span>
                  </div>
                )}

                {/* Desktop Navigation Menu */}
                <div className="hidden lg:flex space-x-1">
                  {menuItems.map((item, idx) => (
                    <Link
                      className="text-sm px-3 py-2 rounded-md border border-transparent hover:border-primary hover:text-primary transition-colors"
                      key={`${item.label}-${idx}`}
                      href={item.url}
                      {...(item.blank ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Right Side - Search, Theme Toggle and User Menu (Desktop Only) */}
              <div className="hidden lg:flex items-center space-x-4 flex-1 justify-end max-w-md">
                <Suspense>
                  <HeaderSearch className="w-full max-w-xs" />
                </Suspense>
                {config.theme.showToggle && (
                  <Suspense>
                    <ThemeToggle />
                  </Suspense>
                )}
                {session !== undefined && (
                  <Suspense>
                    <UserMenu session={session} />
                  </Suspense>
                )}
              </div>

              {/* Mobile Header Controls */}
              <div className="flex items-center justify-between w-full lg:hidden">
                {/* Left: where-am-I crumb — the TakiBar above carries the
                    wordmark */}
                <div className="flex min-w-0 items-center gap-4">
                  {crumbLabel && (
                    <span className="truncate text-sm text-muted-foreground">
                      {crumbLabel}
                    </span>
                  )}
                </div>

                {/* Right: Ask + Search + User Menu */}
                <div className="flex items-center gap-1">
                  {config.ai.showInHeader && (
                    <Suspense>
                      <MobileAskButton />
                    </Suspense>
                  )}
                  {config.navigation.showSearch && (
                    <Suspense>
                      <MobileSearchButton />
                    </Suspense>
                  )}
                  {session !== undefined && (
                    <Suspense>
                      <UserMenu session={session} />
                    </Suspense>
                  )}
                </div>
              </div>
            </div>
          </nav>
        </div>
        )}
      </header>
    </>
  );
}
