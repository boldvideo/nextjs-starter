import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { SearchBar } from "./search-bar";
import { SearchPreview } from "./search-preview";
import { ThemeToggle } from "./theme-toggle";
import { MobileMenu } from "./mobile-menu";

interface HeaderProps {
  logo: any;
  menuItems: Array<{ url: string; label: string }>;
}

export function Header({ logo, menuItems }: HeaderProps) {
  return (
    <>
      <header
        className={`px-5 md:px-10 py-4 border-b border-border transition-all`}
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
                <Suspense>
                  <SearchBar className="w-full max-w-xs" />
                </Suspense>
                <Suspense>
                  <ThemeToggle />
                </Suspense>
              </div>

              {/* Mobile Menu Button */}
              <div className="flex items-center gap-3 md:hidden">
                <Suspense>
                  <ThemeToggle />
                </Suspense>
                <Suspense>
                  <MobileMenu menuItems={menuItems} />
                </Suspense>
              </div>
            </div>

            {/* Mobile Search Row */}
            <div className="md:hidden w-full">
              <Suspense>
                <SearchBar className="w-full" isMobile={true} />
              </Suspense>
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
