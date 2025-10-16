"use client";

import { useState, useEffect } from "react";
import { Repeat } from "lucide-react";
import { usePlaylist } from "@/components/providers/playlist-provider";
import { cn } from "@/lib/utils";

interface ContinuousPlayToggleProps {
  className?: string;
}

export function ContinuousPlayToggle({ className }: ContinuousPlayToggleProps) {
  const { isContinuousPlay, toggleContinuousPlay } = usePlaylist();
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return <div className="w-8 h-8" />; // Placeholder to prevent layout shift
  }

  return (
    <button
      onClick={toggleContinuousPlay}
      className={cn(
        "p-2 rounded-md transition-all duration-200",
        "hover:bg-accent",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        isContinuousPlay
          ? "text-primary bg-primary/10"
          : "text-muted-foreground",
        className
      )}
      aria-label={isContinuousPlay ? "Disable continuous play" : "Enable continuous play"}
      title={isContinuousPlay ? "Continuous play enabled" : "Continuous play disabled"}
    >
      <Repeat
        className={cn(
          "w-5 h-5 transition-transform duration-200",
          isContinuousPlay && "scale-110"
        )}
      />
    </button>
  );
}
