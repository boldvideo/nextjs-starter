"use client";

import { useState, useEffect, KeyboardEvent, useRef } from "react";
import { Search, X, Command } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "../lib/utils";
import { Input } from "./ui/input";

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  isMobile?: boolean;
  autoFocus?: boolean;
}

export function SearchBar({
  className,
  placeholder = "Search videos...",
  isMobile = false,
  autoFocus = false,
}: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isSearchPage = pathname === "/s";
  const currentQuery = searchParams?.get("q") || "";
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Local state for the input value
  const [inputValue, setInputValue] = useState(currentQuery);

  // Update input value when URL query changes
  useEffect(() => {
    setInputValue(currentQuery);
  }, [currentQuery]);

  // Autofocus when requested (e.g., mobile overlay open)
  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  // Set up global keyboard shortcut (desktop only)
  useEffect(() => {
    if (isMobile) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for CMD+K or CTRL+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown as any);
    return () => {
      document.removeEventListener("keydown", handleKeyDown as any);
    };
  }, [isMobile]);

  // Create a function to update URL search params
  const updateSearchParam = (value: string) => {
    if (!searchParams) return;

    const params = new URLSearchParams(searchParams.toString());

    if (value.trim()) {
      params.set("q", value);
    } else {
      params.delete("q");
    }

    return params;
  };

  // Update URL as the user types
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    const params = updateSearchParam(value);
    if (params) {
      router.replace(`${pathname}?${params.toString()}`);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (inputValue.trim()) {
      router.push(`/s?q=${encodeURIComponent(inputValue)}`);
    }
  };

  // Clear search
  const clearSearch = () => {
    setInputValue("");

    // If on search page, go back to home
    if (isSearchPage) {
      router.push("/");
    } else {
      const params = updateSearchParam("");
      if (params) {
        router.replace(`${pathname}?${params.toString()}`);
      }
    }
  };

  // Handle keyboard events
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      clearSearch();
      inputRef.current?.blur();
    }
  };

  // Handle focus events
  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          className={cn("pl-8", isMobile ? "pr-10" : "pr-16")}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          ref={inputRef}
        />
        <div className="absolute right-2 top-2 flex gap-2 items-center">
          {inputValue && (
            <button
              onClick={clearSearch}
              className="text-muted-foreground hover:text-foreground"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {/* Show keyboard shortcuts only on desktop */}
          {!isMobile &&
            (isFocused ? (
              <div className="text-xs flex gap-1 items-center text-muted-foreground border border-border rounded px-1.5 py-0.5">
                <span>ESC</span>
              </div>
            ) : (
              <div className="text-xs flex gap-1 items-center text-muted-foreground border border-border rounded px-1.5 py-0.5">
                <Command className="h-3 w-3" />
                <span>K</span>
              </div>
            ))}
        </div>
      </div>
    </form>
  );
}
