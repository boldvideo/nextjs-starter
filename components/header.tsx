"use client";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileMenu } from "./mobile-menu";
import UserMenu from "@/components/auth/user-menu";
import { useSettings } from "@/components/providers/settings-provider";
import { getPortalConfig } from "@/lib/portal-config";
import type { Session } from "next-auth";

interface HeaderProps {
  logo: any;
  logoDark?: string;
  menuItems: Array<{ url: string; label: string }>;
  session?: Session | null;
  className?: string;
}

export function Header({ logo, logoDark, menuItems, session, className }: HeaderProps) {
  const { settings } = useSettings();
  const config = getPortalConfig(settings);

  // Check if we should use larger header size for wide/short logos
  const useLargeHeader = process.env.NEXT_PUBLIC_LARGE_HEADER === "true";
  const desktopLogoClass = useLargeHeader ? "h-20" : "h-10";
  const mobileLogoClass = useLargeHeader ? "h-16" : "h-8";

  return (
    <>
      <header className={`px-5 lg:px-10 py-4 border-b border-border transition-all ${className || ""}`}>
        <div className="container mx-auto">
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
                      className="text-sm px-3 py-2 rounded-md hover:bg-primary hover:text-primary-foreground transition-colors"
                      key={`${item.label}-${idx}`}
                      href={item.url}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Right Side - Theme Toggle and User Menu (Desktop Only) */}
              <div className="hidden lg:flex items-center space-x-4 flex-1 justify-end">
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
              <div className="grid grid-cols-2 items-center w-full lg:hidden">
                {/* Left: Hamburger Menu */}
                <div className="flex justify-start">
                  <Suspense>
                    <MobileMenu
                      menuItems={menuItems}
                      logo={logo}
                      logoDark={logoDark}
                    />
                  </Suspense>
                </div>

                {/* Right: Logo and User Menu */}
                <div className="flex justify-end items-center space-x-2">
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
