"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** Guest headshot from /shiftai/people/<slug>.jpg, with initials when there is none. */
export function Face({ slug, name, size = 40, className }: { slug?: string; name: string; size?: number; className?: string }) {
  const [broken, setBroken] = useState(false);
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-raised font-mono text-muted-foreground ring-1 ring-border",
        className
      )}
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.3) }}
      aria-hidden="true"
    >
      {initials}
      {slug && !broken && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/shiftai/people/${slug}.jpg`}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full object-cover grayscale-[0.15]"
        />
      )}
    </span>
  );
}
