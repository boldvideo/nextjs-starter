"use client";

import { useState, useEffect, KeyboardEvent, useRef } from "react";
import { Search, X, Command, Sparkles } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "../lib/utils";
import { Input } from "./ui/input";

type SearchMode = "search" | "ask";

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  isMobile?: boolean;
  autoFocus?: boolean;
  showAiToggle?: boolean;
}

export function SearchBar({
  className,
  placeholder = "Search videos...",
  isMobile = false,
  autoFocus = false,
  showAiToggle = true,
}: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isSearchPage = pathname === "/s";
  const isAskPage = pathname === "/ask";
  const currentQuery = searchParams?.get("q") || "";
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  
  // Determine initial mode from URL
  const [mode, setMode] = useState<SearchMode>(() => {
    // If AI toggle is disabled, force search mode
    if (!showAiToggle) return "search";
    if (isAskPage) return "ask";
    return "search";
  });

  // Local state for the input value
  const [inputValue, setInputValue] = useState(currentQuery);

  // Update input value when URL query changes
  useEffect(() => {
    setInputValue(currentQuery);
  }, [currentQuery]);
  
  // Load mode preference from localStorage on client and save changes
  useEffect(() => {
    // Load saved mode on mount (client-side only)
    const savedMode = localStorage.getItem("searchMode") as SearchMode;
    if (savedMode && !isAskPage && !isSearchPage) {
      setMode(savedMode);
    }
  }, [isAskPage, isSearchPage]);
  
  useEffect(() => {
    // Save mode changes to localStorage
    localStorage.setItem("searchMode", mode);
  }, [mode]);

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
        
        // If shift is also pressed, switch to ask mode
        if (e.shiftKey) {
          setMode("ask");
        } else {
          setMode("search");
        }
        
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

  // Update URL as the user types (only in search mode)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Only update URL reactively in search mode
    if (mode === "search") {
      const params = updateSearchParam(value);
      if (params) {
        router.replace(`${pathname}?${params.toString()}`);
      }
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (inputValue.trim()) {
      if (mode === "ask") {
        router.push(`/ask?q=${encodeURIComponent(inputValue)}`);
      } else {
        router.push(`/s?q=${encodeURIComponent(inputValue)}`);
      }
    }
  };

  // Clear search
  const clearSearch = () => {
    setInputValue("");

    // If on search or ask page, go back to home
    if (isSearchPage || isAskPage) {
      router.push("/");
    } else if (mode === "search") {
      const params = updateSearchParam("");
      if (params) {
        router.replace(`${pathname}?${params.toString()}`);
      }
    }
  };
  
  // Toggle between search and ask modes
  const toggleMode = () => {
    const newMode = mode === "search" ? "ask" : "search";
    setMode(newMode);
    // Clear input when switching modes for cleaner UX
    if (inputValue && mode === "search") {
      // Clear URL params when switching from search to ask
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
  
  // Auto-resize textarea in ask mode
  const handleTextareaResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`; // Max ~3 lines
  };
  
  // Get dynamic placeholder based on mode
  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    return mode === "ask" ? "Ask anything about your videos..." : "Search for videos, transcripts...";
  };

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <div className="flex items-center gap-2">
        {/* Mode toggle - smaller, icon-only with tooltip - only show if AI toggle is enabled */}
        {showAiToggle && (
          <div className="relative group">
            <div className="flex items-center bg-sidebar border border-border rounded-md p-0.5">
              <button
                type="button"
                onClick={() => mode !== "search" && toggleMode()}
                className={cn(
                  "relative p-1.5 rounded transition-colors",
                  mode === "search"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="Search mode"
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => mode !== "ask" && toggleMode()}
                className={cn(
                  "relative p-1.5 rounded transition-colors",
                  mode === "ask"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="Ask AI mode"
              >
                <Sparkles className="h-4 w-4" />
              </button>
            </div>
            {/* Tooltip */}
            <div className="absolute left-0 top-full mt-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
              <div className="bg-popover text-popover-foreground text-xs rounded-md px-2 py-1 shadow-md border whitespace-nowrap">
                {mode === "search" ? "Search videos" : "Ask AI a question"}
              </div>
            </div>
          </div>
        )}

        {/* Search input */}
        <div className="relative flex-1 max-w-2xl">
          {/* Icon - always visible based on mode */}
          <div className="absolute left-2 top-2.5 z-20 pointer-events-none">
            {mode === "search" ? (
              <Search className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          
          {mode === "ask" ? (
            <div className="relative">
              {/* Permanent placeholder to maintain layout */}
              <div className="h-10 w-full" />
              
              {/* Always absolutely positioned textarea */}
              <textarea
                placeholder={getPlaceholder()}
                className={cn(
                  "absolute top-0 left-0 right-0 w-full rounded-md border bg-background pl-8 text-sm",
                  "resize-none transition-all duration-200 ease-in-out",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isFocused ? (
                    "z-50 min-h-[80px] py-2.5 shadow-2xl border-primary overflow-auto"
                  ) : (
                    "z-10 h-10 py-2 border-input overflow-hidden"
                  ),
                  inputValue && !isMobile ? "pr-8" : isMobile ? "pr-10" : "pr-14"
                )}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (isFocused) {
                    handleTextareaResize(e);
                  }
                }}
                onKeyDown={(e) => {
                  // Submit on Enter (without shift)
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as any);
                  } else if (e.key === "Escape") {
                    clearSearch();
                    (e.target as HTMLTextAreaElement).blur();
                  }
                }}
                onFocus={(e) => {
                  handleFocus();
                  // Set initial height when focusing
                  setTimeout(() => {
                    if (inputValue) {
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                    }
                  }, 50);
                }}
                onBlur={(e) => {
                  handleBlur();
                  // Reset height when losing focus
                  e.target.style.height = '';
                }}
                ref={inputRef as any}
                rows={1}
              />
            </div>
          ) : (
            <Input
              placeholder={getPlaceholder()}
              className={cn("pl-8", isMobile ? "pr-10" : "pr-16")}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              ref={inputRef}
            />
          )}
          {/* Clear button - only when there's text */}
          {inputValue && (
            <button
              onClick={clearSearch}
              className={cn(
                "absolute text-muted-foreground hover:text-foreground transition-all duration-200",
                mode === "ask" && isFocused 
                  ? "right-2 top-2.5 z-50" 
                  : "right-2 top-2.5 z-20"
              )}
              type="button"
              aria-label="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          
          {/* Keyboard shortcuts - subtle, bottom-right outside on desktop */}
          {!isMobile && !inputValue && (
            <div className={cn(
              "absolute pointer-events-none transition-opacity duration-200 z-20",
              isFocused ? "opacity-0" : "opacity-100",
              "right-2 top-2.5"
            )}>
              <div className="text-xs text-muted-foreground/60">
                {mode === "ask" ? (
                  <div className="flex items-center gap-1">
                    <Command className="h-3 w-3" />
                    <span>⇧K</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Command className="h-3 w-3" />
                    <span>K</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Subtle hint for ask mode when focused */}
          {mode === "ask" && isFocused && !isMobile && (
            <div className="absolute top-[85px] right-0 text-xs text-muted-foreground/50 pointer-events-none z-50">
              Press Enter to send • Shift+Enter for new line
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
