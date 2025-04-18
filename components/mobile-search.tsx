"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { SearchBar } from "./search-bar";
import { usePathname } from "next/navigation";
import React from "react";

// MobileSearch renders a magnifying glass icon that toggles a full‑width
// overlay containing the SearchBar. The overlay is fixed underneath the
// header and can be dismissed by pressing the X icon or navigating away.

interface MobileSearchProps {
  onToggle?: (open: boolean) => void;
}

export function MobileSearch({ onToggle }: MobileSearchProps) {
  const [isOpen, setIsOpen] = useState(false);

  const pathname = usePathname();

  const toggle = () => {
    setIsOpen((prev) => {
      const next = !prev;
      onToggle?.(next);
      return next;
    });
  };

  // Close search when route changes
  React.useEffect(() => {
    setIsOpen(false);
    onToggle?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {/* Toggle Button */}
      <button
        type="button"
        aria-label="Search"
        onClick={toggle}
        className="inline-flex items-center justify-center p-2 rounded-md text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Search className="w-6 h-6" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-x-0 top-16 z-40 bg-background border-b border-border px-4 py-3 md:hidden">
          <SearchBar className="w-full" isMobile autoFocus />
        </div>
      )}
    </>
  );
}
