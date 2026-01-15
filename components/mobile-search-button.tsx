"use client";

import { Search } from "lucide-react";
import { useSearch } from "@/components/providers/search-provider";

export function MobileSearchButton() {
  const { setIsOpen } = useSearch();

  return (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      className="flex items-center justify-center w-11 h-11 -m-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
      aria-label="Search"
      aria-haspopup="dialog"
    >
      <Search className="h-5 w-5" />
    </button>
  );
}
