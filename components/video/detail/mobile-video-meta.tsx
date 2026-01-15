"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileVideoMetaProps {
  title: string;
  publishedAt?: string | null;
  durationLabel?: string | null;
}

export function MobileVideoMeta({
  title,
  publishedAt,
  durationLabel,
}: MobileVideoMetaProps) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();

  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <h1
          className={cn(
            "font-semibold leading-snug text-base",
            !expanded && "line-clamp-1"
          )}
        >
          {title}
        </h1>

        <div
          id={contentId}
          className="text-xs text-muted-foreground leading-snug mt-0.5"
        >
          {publishedAt}
          {publishedAt && durationLabel && " • "}
          {durationLabel}
        </div>
      </div>

      <button
        type="button"
        className="flex items-center text-muted-foreground active:text-foreground p-1 -mr-1 flex-shrink-0"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={contentId}
      >
        <span className="sr-only">
          {expanded ? "Collapse title" : "Expand title"}
        </span>
        <ChevronDown
          className={cn(
            "h-5 w-5 transition-transform duration-200 motion-reduce:transition-none",
            expanded && "rotate-180"
          )}
        />
      </button>
    </div>
  );
}
