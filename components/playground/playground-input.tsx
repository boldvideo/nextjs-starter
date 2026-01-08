"use client";

import { useState, FormEvent } from "react";
import { cn } from "@/lib/utils";

interface PlaygroundInputProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
  placeholder?: string;
  className?: string;
}

export function PlaygroundInput({
  onSubmit,
  isLoading,
  placeholder = "Enter your query...",
  className,
}: PlaygroundInputProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSubmit(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("flex gap-2", className)}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        disabled={isLoading}
        className={cn(
          "flex-1 px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100",
          "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
          "disabled:opacity-50 placeholder:text-zinc-500"
        )}
      />
      <button
        type="submit"
        disabled={isLoading || !query.trim()}
        className={cn(
          "px-4 py-2 rounded-lg font-medium",
          "bg-blue-600 text-white",
          "hover:bg-blue-500",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {isLoading ? "Loading..." : "Submit"}
      </button>
    </form>
  );
}
