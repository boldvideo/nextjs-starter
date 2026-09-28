"use client";

import { useEffect, useState } from "react";

function timecode(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

/**
 * VCR on-screen display framing the hero: PLAY / SP top-left, a running
 * tape counter top-right. Counter starts at page load.
 */
export function GymOsd({ sessions }: { sessions?: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const started = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 z-10 max-w-[1440px] mx-auto px-5 md:px-8 pt-4 md:pt-5 flex justify-between font-osd text-[22px] md:text-[26px] leading-none text-white/85 [text-shadow:0_0_8px_rgba(34,230,255,0.6)]"
    >
      <div className="flex flex-col gap-1">
        <span>PLAY ▶</span>
        <span className="hidden md:inline text-[20px] text-white/55">
          SP{sessions ? ` · ${sessions} TAPES` : ""}
        </span>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="tabular-nums">{timecode(elapsed)}</span>
        <span className="hidden md:inline text-[20px] text-white/55">CH 03</span>
      </div>
    </div>
  );
}
