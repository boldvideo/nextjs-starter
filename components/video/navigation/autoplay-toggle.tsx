"use client";

import { useState, useEffect } from "react";
import { Repeat } from "lucide-react";
import { usePlaylist } from "@/components/providers/playlist-provider";
import { cn } from "@/lib/utils";

interface AutoplayToggleProps {
  className?: string;
}

export function AutoplayToggle({ className }: AutoplayToggleProps) {
  const { isAutoplay, toggleAutoplay } = usePlaylist();
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration pattern
    setMounted(true);
  }, []);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return <div className="w-8 h-8" />; // Placeholder to prevent layout shift
  }

  return (
    <button
      onClick={toggleAutoplay}
      className={cn(
        "p-2 rounded-md transition-all duration-200",
        "hover:bg-accent",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        isAutoplay
          ? "text-primary bg-primary/10"
          : "text-muted-foreground",
        className
      )}
      aria-label={isAutoplay ? "Disable autoplay" : "Enable autoplay"}
      title={isAutoplay ? "Autoplay enabled" : "Autoplay disabled"}
    >
      <Repeat
        className={cn(
          "w-5 h-5 transition-transform duration-200",
          isAutoplay && "scale-110"
        )}
      />
    </button>
  );
}
