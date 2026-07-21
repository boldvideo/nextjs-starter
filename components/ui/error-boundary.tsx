"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => console.error(error), [error]);

  return (
    <div className="relative flex h-full min-h-[60vh] items-center justify-center overflow-hidden px-6 py-16">
      <div className="relative max-w-lg text-center">
        <span className="srl-badge">Technical Difficulties</span>
        <h2 className="mt-5 font-heading text-[clamp(2rem,5vw,3rem)] font-extrabold leading-[1.2]">
          We lost the feed
          <br />
          <span className="srl-gradient-text">for a second there.</span>
        </h2>
        <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
          Not you — us. Run it back, and if it keeps happening the episode
          library still works.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={reset}
            className="flex h-11 cursor-pointer items-center gap-2 rounded-[6px] bg-accent px-5 font-heading text-[15px] font-semibold text-[#09090b] transition-colors hover:bg-[var(--accent-hover)]"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={2.5} />
            Run It Back
          </button>
          <Link
            href="/videos"
            className="flex h-11 items-center rounded-[5.25px] border border-border-strong px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            Browse episodes
          </Link>
        </div>
      </div>
    </div>
  );
}
