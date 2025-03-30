"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import logo from "../public/yourlogohere.png";
import { ThemeToggle } from "./theme-toggle";

type MenuItem = {
  url: string;
  label: string;
};

type Props = { menuItems: Array<MenuItem> };

export function MobileMenu({ menuItems }: Props) {
  const [isMobileMenu, setIsMobileMenu] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
          <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-background px-5 py-4 sm:max-w-sm sm:ring-1 sm:ring-border">
            <div className="flex items-center justify-between">
              <Link
                href="/"
                className=""
                onClick={() => setIsMobileMenu(false)}
              >
                <Image
                  src={logo}
                  alt="Logo"
                  className="h-12 md:h-16 object-contain object-left"
                />
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
                    className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-foreground hover:bg-primary"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
