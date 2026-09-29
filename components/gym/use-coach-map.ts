"use client";

import { useEffect, useState } from "react";
import type { AskCitation } from "@/lib/ask";
import { COACHES, type Coach } from "./gym-coaches-data";

// One fetch per page load, shared by every clip and drill on the page.
let cache: Record<string, string> | null = null;
let inflight: Promise<Record<string, string>> | null = null;

function load(): Promise<Record<string, string>> {
  inflight ??= fetch("/api/gym/coach-map")
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}))
    .then((map: Record<string, string>) => (cache = map));
  return inflight;
}

/** Resolves the coach who leads the session a citation comes from. */
export function useCoachOf(): (citation: AskCitation | null | undefined) => Coach | null {
  const [map, setMap] = useState<Record<string, string> | null>(cache);

  useEffect(() => {
    if (cache) return;
    let alive = true;
    load().then((m) => alive && setMap(m));
    return () => {
      alive = false;
    };
  }, []);

  return (citation) => {
    if (!citation || !map) return null;
    const slug = map[citation.videoId] ?? map[citation.playbackId];
    return COACHES.find((c) => c.slug === slug) ?? null;
  };
}
