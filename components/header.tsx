"use client";
import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SearchBar } from "./search-bar";
import { SearchPreview } from "./search-preview";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileMenu } from "./mobile-menu";
import { MobileSearch } from "@/components/mobile-search";
import UserMenu from "@/components/auth/user-menu";
import { isAuthEnabled } from "@/config/auth";
import type { Session } from "next-auth";

interface HeaderProps {
  logo: any;
  logoDark?: string;
  menuItems: Array<{ url: string; label: string }>;
  session?: Session | null;
}

export function Header({ logo, logoDark, menuItems, session }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header
        className={
          `px-5 lg:px-10 py-4 border-b border-border transition-all ` +
          (searchOpen ? "sticky top-0 z-50 bg-background/90 backdrop-blur" : "")
        }
      >
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
                        className="h-10 w-auto object-contain block dark:hidden"
                        height={40}
                        width={160}
                        priority
                      />
                      {/* Dark Mode Logo */}
                      <Image
                        src={logoDark}
                        alt="Logo"
                        className="h-10 w-auto object-contain hidden dark:block"
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
                      className="h-10 w-auto object-contain"
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

              {/* Right Side - Search, Theme Toggle, and User Menu (Desktop Only) */}
              <div className="hidden lg:flex items-center space-x-4 flex-1 justify-end max-w-md">
                <Suspense>
                  <SearchBar className="w-full max-w-xs" />
                </Suspense>
                <Suspense>
                  <ThemeToggle />
                </Suspense>
                {isAuthEnabled() && session !== undefined && (
                  <Suspense>
                    <UserMenu session={session} />
                  </Suspense>
                )}
              </div>

              {/* Mobile Header Controls */}
              <div className="grid grid-cols-3 items-center w-full lg:hidden">
                {/* Left: Hamburger Menu */}
                <div className="flex justify-start">
                  {!searchOpen && (
                    <Suspense>
                      <MobileMenu
                        menuItems={menuItems}
                        logo={logo}
                        logoDark={logoDark}
                      />
                    </Suspense>
                  )}
                </div>

                {/* Center: Logo */}
                <div className="flex justify-center">
                  <Link href="/">
                    {logoDark ? (
                      <>
                        {/* Light Mode Logo */}
                        <Image
                          src={logo}
                          alt="Logo"
                          className="h-8 w-auto object-contain block dark:hidden"
                          height={32}
                          width={128}
                        />
                        {/* Dark Mode Logo */}
                        <Image
                          src={logoDark}
                          alt="Logo"
                          className="h-8 w-auto object-contain hidden dark:block"
                          height={32}
                          width={128}
                        />
                      </>
                    ) : (
                      // Default Logo if no dark variant
                      <Image
                        src={logo}
                        alt="Logo"
                        className="h-8 w-auto object-contain"
                        height={32}
                        width={128}
                      />
                    )}
                  </Link>
                </div>

                {/* Right: Search icon / Close icon */}
                <div className="flex justify-end">
                  <Suspense>
                    <MobileSearch onToggle={setSearchOpen} />
                  </Suspense>
                </div>
              </div>
            </div>
          </nav>
        </div>
      </header>

      <Suspense>
        <SearchPreview />
      </Suspense>
    </>
  );
}
