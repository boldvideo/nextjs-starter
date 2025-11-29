"use client";

import { Search, Command } from "lucide-react";
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
        "relative flex items-center gap-2 w-full text-sm border border-input rounded-lg bg-muted/30 hover:bg-muted/60 hover:border-accent transition-all duration-200 group cursor-text text-left",
        isMobile ? "h-10 px-3" : "h-10 px-3",
        className
      )}
    >
      {/* Icon */}
      <Search className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />

      {/* Placeholder Text */}
      <span className="flex-1 text-muted-foreground truncate">
        {placeholder || "Search..."}
      </span>

      {/* Shortcut Hint (Desktop only) */}
      {!isMobile && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 bg-muted/50 px-1.5 py-0.5 rounded border border-border/50">
          <Command className="h-3 w-3" />
          <span>K</span>
        </div>
      )}
    </button>
  );
}
