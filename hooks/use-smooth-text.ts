"use client";

import { useEffect, useRef, useState } from "react";

/**
 * How far back from the end of the text we look for unterminated markdown
 * constructs. Past this window we reveal anyway so a stray "[" or "**" in
 * prose can never stall the stream.
 */
const HOLDBACK_WINDOW = 120;

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let idx = haystack.indexOf(needle);
  while (idx !== -1) {
    count++;
    idx = haystack.indexOf(needle, idx + needle.length);
  }
  return count;
}

/**
 * Largest prefix of `text` that is safe to render mid-stream: never cuts
 * inside a `[c_xxx]` / `[12:34]` token, an unclosed `**bold**` or `` `code` ``
 * span, or right after a bare block marker ("###", "-", "2.") that would
 * briefly render as literal characters before its content arrives.
 */
export function safeRevealBoundary(text: string): number {
  let end = text.length;
  const windowStart = Math.max(0, end - HOLDBACK_WINDOW);

  // Incomplete inline token: a "[" with no "]" after it.
  const lastOpen = text.lastIndexOf("[");
  if (lastOpen >= windowStart && !text.includes("]", lastOpen)) {
    end = lastOpen;
  }

  // Unpaired ** or ` within the paragraph currently being written.
  const paraBreak = text.lastIndexOf("\n\n", end - 1);
  const paragraph = text.slice(paraBreak === -1 ? 0 : paraBreak + 2, end);

  if (countOccurrences(paragraph, "**") % 2 === 1) {
    const lastBold = text.lastIndexOf("**", end - 1);
    if (lastBold >= windowStart) end = Math.min(end, lastBold);
  }

  if (countOccurrences(paragraph, "`") % 2 === 1) {
    const lastTick = text.lastIndexOf("`", end - 1);
    if (lastTick >= windowStart) end = Math.min(end, lastTick);
  }

  // A block marker alone at the end of the text ("###", "-", "1.") — hold it
  // back until its first word arrives so it doesn't flash as literal text.
  const lineStart = text.lastIndexOf("\n", end - 1) + 1;
  const lastLine = text.slice(lineStart, end);
  if (/^(#{1,6}|[-*+]|>|\d{1,3}\.)\s*$/.test(lastLine)) {
    end = lineStart;
  }

  return end;
}

/**
 * Decouples the visual reveal of streamed text from network chunk cadence.
 *
 * While `enabled`, incoming text accumulates in a backlog that is drained at a
 * steady, adaptive rate on animation frames — bursts glide out instead of
 * popping, and stalls just pause the caret. The reveal speed scales with the
 * backlog (draining it in roughly a third of a second) so it keeps pace with
 * any generation speed while staying ~a beat behind the wire.
 *
 * When `enabled` is false the full text is returned untouched.
 */
export function useSmoothText(text: string, enabled: boolean): string {
  const [visibleCount, setVisibleCount] = useState(() =>
    enabled ? 0 : text.length
  );
  const textRef = useRef(text);
  const countRef = useRef(enabled ? 0 : text.length);
  const carryRef = useRef(0);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    if (!enabled) return;

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;

      const current = textRef.current;
      // Text was replaced with something shorter (message reset).
      if (countRef.current > current.length) {
        countRef.current = current.length;
        setVisibleCount(countRef.current);
      }

      const target = safeRevealBoundary(current);
      const backlog = target - countRef.current;

      if (backlog > 0) {
        // chars/second: floor keeps a gentle trickle, scale drains the backlog
        // in ~300ms, cap keeps giant cached bursts readable.
        const speed = Math.min(2000, Math.max(90, backlog * 3.2));
        carryRef.current += (speed * dt) / 1000;
        const step = Math.floor(carryRef.current);
        if (step > 0) {
          carryRef.current -= step;
          countRef.current = Math.min(target, countRef.current + step);
          setVisibleCount(countRef.current);
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);

  if (!enabled) return text;
  return text.slice(0, Math.min(visibleCount, text.length));
}
