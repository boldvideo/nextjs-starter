"use client";
import React, { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowUp } from "lucide-react";

export default function Home() {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        router.push(`/ask?q=${encodeURIComponent(query.trim())}`);
      }
    },
    [query, router]
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const placeholder = "Need clarity, connection, or calm? Just ask.";

  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-3xl mx-auto text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Get 1,000 hours of coaching in 60 seconds.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            FounderWell&apos;s best advice is distilled from years of calls and is now just one question away.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="relative group">
          <div
            className={`relative flex items-center rounded-2xl border ${
              isFocused
                ? "border-primary shadow-lg shadow-primary/10"
                : "border-border hover:border-primary/50"
            } bg-background transition-all duration-200`}
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              className="flex-1 px-6 py-5 text-lg bg-transparent outline-none placeholder:text-muted-foreground/50 transition-all"
              aria-label="Ask a question"
            />
            
            <button
              type="submit"
              disabled={!query.trim()}
              className={`mr-2 p-3 rounded-xl transition-all duration-200 ${
                query.trim()
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
              aria-label="Submit question"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          </div>
        </form>

        <div className="flex flex-wrap gap-2 justify-center items-center">
          <span className="text-sm text-muted-foreground">Try:</span>
          {[
            "Navigating burnout & isolation",
            "Managing team stress & culture",
            "Leading with wellbeing under pressure",
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => {
                setQuery(suggestion);
                inputRef.current?.focus();
              }}
              className="text-sm px-3 py-1.5 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}