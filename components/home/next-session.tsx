"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const LUMA_CALENDAR = "https://luma.com/baml";
const LIVE_WINDOW_MS = 90 * 60 * 1000;

interface NextEvent {
  name: string;
  startAt: string;
  url: string;
}

/** The known cadence: Tuesdays 10am PT (17:00 UTC in summer). */
function nextTuesdayFallback(): Date {
  const now = new Date();
  const d = new Date(now);
  d.setUTCHours(17, 0, 0, 0);
  while (d.getUTCDay() !== 2 || d.getTime() <= now.getTime()) {
    d.setUTCDate(d.getUTCDate() + 1);
    d.setUTCHours(17, 0, 0, 0);
  }
  return d;
}

function formatCountdown(ms: number): string {
  const mins = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const minutes = mins % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Live countdown to the next session, sourced from the show's Luma
 * calendar with the weekly cadence as fallback. Goes solid "LIVE NOW"
 * during the session window.
 */
export function NextSession() {
  const [event, setEvent] = useState<NextEvent | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    fetch("/api/next-session")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.event) setEvent(d.event);
      })
      .catch(() => {});
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      cancelled = true;
      clearInterval(tick);
    };
  }, []);

  const startMs = event ? Date.parse(event.startAt) : nextTuesdayFallback().getTime();
  const href = event?.url ?? LUMA_CALENDAR;
  const isLive = now >= startMs && now < startMs + LIVE_WINDOW_MS;
  const label = isLive
    ? `LIVE NOW${event?.name ? ` · ${event.name}` : ""}`
    : `Next session in ${formatCountdown(startMs - now)}${event?.name ? ` · ${event.name}` : " · Tuesdays 10am PT"}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-2 font-mono text-[11px] max-w-full",
        isLive
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground transition-colors"
      )}
      title="Join live on Luma"
    >
      <span className="relative flex h-[7px] w-[7px] shrink-0">
        {!isLive && (
          <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60" />
        )}
        <span
          className={cn(
            "relative inline-flex h-[7px] w-[7px] rounded-full bg-primary",
            isLive && "shadow-[0_0_8px_rgba(45,212,191,0.8)]"
          )}
        />
      </span>
      <span className="truncate">{label}</span>
    </a>
  );
}
