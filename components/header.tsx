"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { SearchBar } from "./search-bar";
import { SearchPreview } from "./search-preview";
import { ThemeToggle } from "./theme-toggle";
import { MobileMenu } from "./mobile-menu";

interface HeaderProps {
  logo: any;
  menuItems: Array<{ url: string; label: string }>;
}

export function Header({ logo, menuItems }: HeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams?.get("q") || "";
  const isSearchPage = pathname === "/s";

  return (
    <>
      <header
        className={`px-5 md:px-10 py-4 border-b border-border transition-all ${
          query && !isSearchPage ? "bg-primary/5" : ""
        }`}
      >
        <div className="container mx-auto">
          <nav className="flex flex-col md:flex-row gap-4 md:gap-0">
            <div className="flex items-center justify-between w-full">
              {/* Logo */}
              <div className="flex items-center">
                <Link href="/" className="mr-8">
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
                <SearchBar className="w-full max-w-xs" />
                <ThemeToggle />
              </div>

              {/* Mobile Menu Button */}
              <div className="flex items-center gap-3 md:hidden">
                <ThemeToggle />
                <MobileMenu menuItems={menuItems} />
              </div>
            </div>

            {/* Mobile Search Row */}
            <div className="md:hidden w-full">
              <SearchBar className="w-full" isMobile={true} />
            </div>
          </nav>
        </div>
      </header>

      <SearchPreview />
    </>
  );
}
