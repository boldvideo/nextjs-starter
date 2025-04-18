"use client";
import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SearchBar } from "./search-bar";
import { SearchPreview } from "./search-preview";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileMenu } from "./mobile-menu";
import { MobileSearch } from "@/components/mobile-search";

interface HeaderProps {
  logo: any;
  menuItems: Array<{ url: string; label: string }>;
}

export function Header({ logo, menuItems }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header
        className={
          `px-5 md:px-10 py-4 border-b border-border transition-all ` +
          (searchOpen ? "sticky top-0 z-50 bg-background/90 backdrop-blur" : "")
        }
      >
        <div className="container mx-auto">
          <nav className="flex flex-col md:flex-row gap-4 md:gap-0">
            <div className="flex items-center justify-between w-full">
              {/* Logo */}
              <div className="flex items-center">
                <Link href="/" className="mr-8 hidden md:block">
                  <Image
                    src={logo}
                    alt="Logo"
                    className="h-10 w-auto object-contain"
                    height={40}
                    width={160}
                    priority
                  />
                </Link>

                {/* Desktop Navigation Menu */}
                <div className="hidden md:flex space-x-1">
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

              {/* Right Side - Search and Theme Toggle (Desktop Only) */}
              <div className="hidden md:flex items-center space-x-4 flex-1 justify-end max-w-md">
                <Suspense>
                  <SearchBar className="w-full max-w-xs" />
                </Suspense>
                <Suspense>
                  <ThemeToggle />
                </Suspense>
              </div>

              {/* Mobile Header Controls */}
              <div className="grid grid-cols-3 items-center w-full md:hidden">
                {/* Left: Hamburger Menu */}
                <div className="flex justify-start">
                  {!searchOpen && (
                    <Suspense>
                      <MobileMenu menuItems={menuItems} />
                    </Suspense>
                  )}
                </div>

                {/* Center: Logo */}
                <div className="flex justify-center">
                  <Link href="/">
                    <Image
                      src={logo}
                      alt="Logo"
                      className="h-8 w-auto object-contain"
                      height={32}
                      width={128}
                    />
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
