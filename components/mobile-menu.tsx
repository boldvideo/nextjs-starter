"use client";

import { useState } from "react";
import Image, { StaticImageData } from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import { ThemeToggle } from "./theme-toggle";
import { useSettings } from "@/components/providers/settings-provider";
import { getPortalConfig } from "@/lib/portal-config";

type MenuItem = {
  url: string;
  label: string;
};

type Props = {
  menuItems: Array<MenuItem>;
  logo: StaticImageData | string;
  logoDark?: StaticImageData | string;
};

export function MobileMenu({ menuItems, logo, logoDark }: Props) {
  const [isMobileMenu, setIsMobileMenu] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const settings = useSettings();
  const config = getPortalConfig(settings);

  // Check if we're on the search page
  const isSearchPage = pathname === "/s";

  return (
    <>
      <button
        type="button"
        className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-foreground"
        onClick={() => setIsMobileMenu(true)}
      >
        <span className="sr-only">Open main menu</span>
        <Menu className="w-6 h-6" />
      </button>
      {isMobileMenu ? (
        <div className="">
          <div
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            onClick={() => setIsMobileMenu(false)}
          />
          <div
            className={cn(
              "fixed inset-y-0 left-0 z-50 w-full overflow-y-auto bg-background px-5 py-4 sm:max-w-sm sm:ring-1 sm:ring-border transition-transform duration-300 ease-in-out transform",
              isMobileMenu ? "translate-x-0" : "-translate-x-full"
            )}
          >
            <div className="flex items-center justify-between">
              <Link
                href="/"
                className=""
                onClick={() => setIsMobileMenu(false)}
              >
                {logoDark ? (
                  <>
                    {/* Light Mode Logo */}
                    <Image
                      src={logo}
                      alt="Logo"
                      className="h-12 md:h-16 object-contain object-left block dark:hidden"
                      height={64}
                      width={200}
                      priority
                    />
                    {/* Dark Mode Logo */}
                    <Image
                      src={logoDark}
                      alt="Logo"
                      className="h-12 md:h-16 object-contain object-left hidden dark:block"
                      height={64}
                      width={200}
                      priority
                    />
                  </>
                ) : (
                  // Default Logo if no dark variant
                  <Image
                    src={logo}
                    alt="Logo"
                    className="h-12 md:h-16 object-contain object-left"
                    height={64}
                    width={200}
                    priority
                  />
                )}
              </Link>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-foreground"
                onClick={() => setIsMobileMenu(false)}
              >
                <span className="sr-only">Close menu</span>
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="space-y-2 py-6">
                {menuItems.map((item: any) => (
                  <Link
                    key={item.url}
                    href={item.url}
                    onClick={() => setIsMobileMenu(false)}
                    className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              {config.theme.showToggle && (
                <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between border-t border-border pt-4">
                  <span className="text-sm font-medium text-foreground">
                    Toggle Dark Mode
                  </span>
                  <ThemeToggle />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
