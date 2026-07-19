"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearch } from "@/components/providers/search-provider";

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  isMobile?: boolean;
  autoFocus?: boolean;
}

export function SearchBar({
  className,
  placeholder,
  isMobile = false,
}: SearchBarProps) {
  const { setIsOpen } = useSearch();

  return (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      className={cn(
        "flex items-center gap-2.5 w-full h-[36px] pl-3.5 pr-2",
        "text-sm text-muted-foreground text-left",
        "rounded-full border border-border bg-surface",
        "hover:border-accent hover:text-foreground transition-colors cursor-text",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        !isMobile && "min-w-[240px]",
        className
      )}
    >
      {/* Icon */}
      <Search className="h-[15px] w-[15px] shrink-0" />

      {/* Placeholder Text */}
      <span className="flex-1 truncate">
        {placeholder || "Search the library…"}
      </span>

      {/* Shortcut Hint — pointer-and-keyboard screens only */}
      {!isMobile && (
        <span className="hidden md:inline-block rounded-md font-mono text-[11px] tracking-[0.04em] text-muted-foreground border border-border bg-muted px-1.5 py-0.5">
          ⌘K
        </span>
      )}
    </button>
  );
}
