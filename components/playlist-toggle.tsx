"use client";

import { List } from "lucide-react";

interface PlaylistToggleProps {
  onToggle: () => void;
}

export function PlaylistToggle({ onToggle }: PlaylistToggleProps) {
  return (
    <button
      type="button"
      className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-foreground"
      onClick={onToggle}
    >
      <span className="sr-only">Open playlist selector</span>
      <List className="w-6 h-6" />
    </button>
  );
}
