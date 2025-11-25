"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { usePathname } from "next/navigation";

interface SearchContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
  mode: "search" | "ask";
  setMode: (mode: "search" | "ask") => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"search" | "ask">("search");
  const pathname = usePathname();

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  // Load saved mode
  /*
  useEffect(() => {
    const savedMode = localStorage.getItem("searchMode") as "search" | "ask";
    if (savedMode) {
      setMode(savedMode);
    }
  }, []);

  // Save mode
  useEffect(() => {
    localStorage.setItem("searchMode", mode);
  }, [mode]);
  */

  // Close on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        
        // If modal is already open, toggle mode if shift is pressed? 
        // Or just toggle visibility?
        // Let's follow standard pattern: toggle open/close
        
        if (isOpen) {
            setIsOpen(false);
        } else {
            setIsOpen(true);
            // if (e.shiftKey) {
            //    setMode("ask");
            // } else {
                // Keep previous mode or reset? Resetting to search is usually safer
                setMode("search"); 
            // }
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <SearchContext.Provider value={{ isOpen, setIsOpen, toggle, mode, setMode }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
}
