"use client";
import { Suspense } from "react";
import Image, { StaticImageData } from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileMenu } from "./mobile-menu";
import UserMenu from "@/components/auth/user-menu";
import { HeaderSearch } from "@/components/header-search";
import { MobileSearchButton } from "@/components/mobile-search-button";
import { MobileAskButton } from "@/components/mobile-ask-button";
import { useSettings } from "@/components/providers/settings-provider";
import { getPortalConfig } from "@/lib/portal-config";
import type { Session } from "next-auth";

interface HeaderProps {
  logo: StaticImageData | string;
  logoDark?: string;
  menuItems: Array<{ url: string; label: string; blank?: boolean }>;
  session?: Session | null;
  className?: string;
}

export function Header({
  logo,
  logoDark,
  menuItems,
  session,
  className,
}: HeaderProps) {
  const settings = useSettings();
  const config = getPortalConfig(settings);

  // Logo scales with header height
  // Desktop: header height minus 24px for visual breathing room
  // Mobile: fixed 32px (h-8)
  const desktopLogoClass = "h-[calc(var(--header-height)-24px)]";
  const mobileLogoClass = "h-8";

  return (
    <>
      <header
        className={`fixed top-0 w-full z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-5 border-b border-border transition-all h-[var(--header-height)] flex items-center ${
          className || ""
        }`}
      >
        <div className="mx-auto w-full">
          <nav className="flex flex-col lg:flex-row gap-4 lg:gap-0">
            <div className="flex items-center justify-between w-full">
              {/* Logo */}
              <div className="flex items-center">
                <Link href="/" className="mr-8 hidden lg:block">
                  {logoDark ? (
                    <>
                      {/* Light Mode Logo */}
                      <Image
                        src={logo}
                        alt="Logo"
                        className={`${desktopLogoClass} w-auto object-contain block dark:hidden`}
                        height={40}
                        width={160}
                        priority
                      />
                      {/* Dark Mode Logo */}
                      <Image
                        src={logoDark}
                        alt="Logo"
                        className={`${desktopLogoClass} w-auto object-contain hidden dark:block`}
                        height={40}
                        width={160}
                        priority
                      />
                    </>
                  ) : (
                    // Default Logo if no dark variant
                    <Image
                      src={logo}
                      alt="Logo"
                      className={`${desktopLogoClass} w-auto object-contain`}
                      height={40}
                      width={160}
                      priority
                    />
                  )}
                </Link>

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
                {/* Left: Hamburger Menu and Logo */}
                <div className="flex items-center gap-4">
                  <Suspense>
                    <MobileMenu
                      menuItems={menuItems}
                      logo={logo}
                      logoDark={logoDark}
                    />
                  </Suspense>

                  <Link href="/">
                    {logoDark ? (
                      <>
                        {/* Light Mode Logo */}
                        <Image
                          src={logo}
                          alt="Logo"
                          className={`${mobileLogoClass} w-auto object-contain block dark:hidden`}
                          height={32}
                          width={128}
                        />
                        {/* Dark Mode Logo */}
                        <Image
                          src={logoDark}
                          alt="Logo"
                          className={`${mobileLogoClass} w-auto object-contain hidden dark:block`}
                          height={32}
                          width={128}
                        />
                      </>
                    ) : (
                      // Default Logo if no dark variant
                      <Image
                        src={logo}
                        alt="Logo"
                        className={`${mobileLogoClass} w-auto object-contain`}
                        height={32}
                        width={128}
                      />
                    )}
                  </Link>
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
      </header>
    </>
  );
}
