"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { formatDuration } from "util/format-duration";
import { cn } from "@/lib/utils";
import { useProgress } from "@/components/providers/progress-provider";

/**
 * Mux storyboard metadata, fetched once per playback id on first hover.
 * https://image.mux.com/{id}/storyboard.json
 */
interface Storyboard {
  url: string;
  tile_width: number;
  tile_height: number;
  duration: number;
  tiles: { start: number; x: number; y: number }[];
}
const storyboardCache = new Map<string, Promise<Storyboard | null>>();

function loadStoryboard(playbackId: string): Promise<Storyboard | null> {
  let p = storyboardCache.get(playbackId);
  if (!p) {
    p = fetch(`https://image.mux.com/${playbackId}/storyboard.json`)
      .then((r) => (r.ok ? (r.json() as Promise<Storyboard>) : null))
      .then(async (sb) => {
        if (!sb) return null;
        // Download AND decode the sheet before reporting ready — otherwise
        // the first scrub paints nothing until the background image lands.
        await new Promise<void>((resolve) => {
          const img = new window.Image();
          img.onload = () => {
            if (img.decode) img.decode().then(resolve, () => resolve());
            else resolve();
          };
          img.onerror = () => resolve();
          img.src = sb.url;
        });
        return sb;
      })
      .catch(() => null);
    storyboardCache.set(playbackId, p);
  }
  return p;
}

interface SrlScrubThumbProps {
  thumbnail?: string;
  title?: string;
  duration?: number;
  playbackId?: string;
  /** Enables the local watch-progress bar along the bottom edge. */
  videoId?: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
}

/**
 * Episode thumbnail that scrubs through the show on hover via the Mux
 * storyboard (one sprite sheet for all frames). Desktop: sweep the
 * pointer across the thumb. Touch: long-press, then drag. React state
 * only gates mount (loaded / hovering); per-mousemove updates write
 * styles directly so scrubbing never re-renders the card.
 */
export function SrlScrubThumb({
  thumbnail,
  title = "",
  duration = 0,
  playbackId,
  videoId,
  priority = false,
  sizes = "(max-width: 768px) 78vw, (max-width: 1024px) 46vw, 300px",
  className,
}: SrlScrubThumbProps) {
  // Local watch progress (IndexedDB via ProgressProvider, synced across
  // tabs). Furthest-watched fraction 0..1; completed shows a full bar.
  const { progressMap } = useProgress();
  const record = videoId ? progressMap.get(videoId) : undefined;
  const progress = record
    ? record.completed
      ? 1
      : record.duration > 0
        ? Math.min(1, record.furthestPosition / record.duration)
        : 0
    : 0;

  // storyboard: undefined = still loading, null = unavailable.
  const [storyboard, setStoryboard] = useState<Storyboard | null | undefined>(
    undefined
  );
  const [hovering, setHovering] = useState(false);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const playheadRef = useRef<HTMLDivElement | null>(null);
  const badgeRef = useRef<HTMLSpanElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const lastFracRef = useRef(0);

  const applyFrac = useCallback(
    (sb: Storyboard | null | undefined, frac: number) => {
      // Playhead + timecode respond instantly (they only need the video
      // duration); frames join once the sheet has loaded.
      const seconds = frac * (sb?.duration ?? duration ?? 0);
      if (playheadRef.current) {
        playheadRef.current.style.left = `${frac * 100}%`;
      }
      if (badgeRef.current) {
        badgeRef.current.textContent = formatDuration(Math.floor(seconds));
      }
      if (!sb || sb.tiles.length === 0) return;

      const tiles = sb.tiles;
      let tile = tiles[0];
      for (const t of tiles) {
        if (t.start <= seconds) tile = t;
        else break;
      }
      const el = frameRef.current;
      if (el) {
        // Pixel-exact tile placement. Percentage background-position
        // amplifies tile rounding error across the sheet (frames drift
        // diagonally the deeper the tile). Scale to cover, anchor top-left:
        // worst case is a 1–2px crop at the frame's right/bottom edge.
        const rect = el.getBoundingClientRect();
        const sheetW = Math.max(...tiles.map((t) => t.x)) + sb.tile_width;
        const sheetH = Math.max(...tiles.map((t) => t.y)) + sb.tile_height;
        const scale = Math.max(
          rect.width / sb.tile_width,
          rect.height / sb.tile_height
        );
        el.style.backgroundSize = `${sheetW * scale}px ${sheetH * scale}px`;
        el.style.backgroundPosition = `${-tile.x * scale}px ${-tile.y * scale}px`;
      }
    },
    [duration]
  );

  const warm = useCallback(() => {
    if (!playbackId) return;
    loadStoryboard(playbackId).then((sb) => setStoryboard(sb));
  }, [playbackId]);

  const handleThumbEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!playbackId) return;
      if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches)
        return;
      warm();
      const rect = e.currentTarget.getBoundingClientRect();
      lastFracRef.current = Math.min(
        1,
        Math.max(0, (e.clientX - rect.left) / rect.width)
      );
      setHovering(true);
    },
    [playbackId, warm]
  );

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (storyboard === null) return; // no storyboard for this video
      const rect = e.currentTarget.getBoundingClientRect();
      const frac = Math.min(
        1,
        Math.max(0, (e.clientX - rect.left) / rect.width)
      );
      lastFracRef.current = frac;
      applyFrac(storyboard, frac);
    },
    [storyboard, applyFrac]
  );

  const handleLeave = useCallback(() => setHovering(false), []);

  // ── Touch: long-press (350ms) then drag horizontally to scrub a preview;
  // release dismisses it. A quick tap still navigates normally, and moving
  // before the long-press fires means scrolling wins.
  const storyboardRef = useRef<Storyboard | null | undefined>(undefined);
  useEffect(() => {
    storyboardRef.current = storyboard;
  }, [storyboard]);
  const touchRef = useRef<{
    timer: number | null;
    startX: number;
    startY: number;
    active: boolean;
    suppressClick: boolean;
  }>({ timer: null, startX: 0, startY: 0, active: false, suppressClick: false });

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!playbackId || e.touches.length !== 1) return;
      warm();
      const t = e.touches[0];
      const state = touchRef.current;
      state.startX = t.clientX;
      state.startY = t.clientY;
      state.suppressClick = false;
      if (state.timer) clearTimeout(state.timer);
      state.timer = window.setTimeout(() => {
        state.timer = null;
        state.active = true;
        (
          navigator as Navigator & { vibrate?: (ms: number) => void }
        ).vibrate?.(10);
        const el = thumbRef.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          lastFracRef.current = Math.min(
            1,
            Math.max(0, (state.startX - rect.left) / rect.width)
          );
        }
        setHovering(true);
      }, 350);
    },
    [playbackId, warm]
  );

  const handleTouchEnd = useCallback(() => {
    const state = touchRef.current;
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
    if (state.active) {
      // The scrub is a preview only — release dismisses it, and the ghost
      // click on lift-off is swallowed so there are no accidental opens.
      state.active = false;
      state.suppressClick = true;
      setHovering(false);
    }
  }, []);

  const handleClickCapture = useCallback((e: React.MouseEvent) => {
    // Swallow the ghost click that follows a scrub release
    if (touchRef.current.suppressClick) {
      e.preventDefault();
      e.stopPropagation();
      touchRef.current.suppressClick = false;
    }
  }, []);

  // Native non-passive touchmove: React's synthetic handler can't
  // preventDefault, and we must beat scrolling while scrubbing.
  useEffect(() => {
    const el = thumbRef.current;
    if (!el) return;
    const onTouchMove = (ev: TouchEvent) => {
      const state = touchRef.current;
      const t = ev.touches[0];
      if (!t) return;
      if (state.active) {
        ev.preventDefault();
        const rect = el.getBoundingClientRect();
        const frac = Math.min(
          1,
          Math.max(0, (t.clientX - rect.left) / rect.width)
        );
        lastFracRef.current = frac;
        const sb = storyboardRef.current;
        if (sb && sb.tiles.length > 0) applyFrac(sb, frac);
      } else if (
        state.timer &&
        (Math.abs(t.clientX - state.startX) > 10 ||
          Math.abs(t.clientY - state.startY) > 10)
      ) {
        // Finger moved before the long-press fired — it's a scroll
        clearTimeout(state.timer);
        state.timer = null;
      }
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, [applyFrac]);

  // Frames need the loaded sheet; playhead + timecode respond immediately.
  const isScrubbing =
    hovering && storyboard != null && storyboard.tiles.length > 0;
  const isSheetLoading = hovering && !!playbackId && storyboard === undefined;
  const showScrubUi = isScrubbing || isSheetLoading;

  // Position the frame (or at least playhead/timecode) before first paint
  // when scrub mode mounts, so there is never a flash of the raw sheet.
  useLayoutEffect(() => {
    if (showScrubUi) applyFrac(storyboard, lastFracRef.current);
  }, [showScrubUi, storyboard, applyFrac]);

  // Sheet image is static per storyboard; size + position are written
  // imperatively (pixel-exact) in applyFrac.
  const sheetStyle: React.CSSProperties | undefined = isScrubbing
    ? { backgroundImage: `url(${storyboard.url})` }
    : undefined;

  return (
    <div
      ref={thumbRef}
      className={cn(
        "relative aspect-video select-none overflow-hidden rounded-xl border border-border bg-muted [-webkit-touch-callout:none]",
        className
      )}
      onMouseEnter={handleThumbEnter}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onClickCapture={handleClickCapture}
      onContextMenu={(e) => {
        if (touchRef.current.active || touchRef.current.timer)
          e.preventDefault();
      }}
    >
      {thumbnail ? (
        <Image
          src={thumbnail}
          alt={title}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
      ) : (
        <span className="absolute inset-0 bg-muted" aria-hidden="true" />
      )}

      {/* Storyboard frame while scrubbing (position set imperatively).
          No duration-* utility here: it sets transition-duration, and the
          implicit transition-property:all would animate background-position
          — the sheet visibly slides between tiles instead of cutting. */}
      {isScrubbing && (
        <div
          ref={frameRef}
          className="absolute inset-0 transition-none motion-safe:animate-in motion-safe:fade-in [animation-duration:150ms]"
          style={sheetStyle}
        />
      )}

      {/* Playhead — live as soon as the pointer scrubs; fades in with
          the frames so nothing pops */}
      {showScrubUi && (
        <div
          ref={playheadRef}
          className="absolute inset-y-0 w-px bg-white/70 motion-safe:animate-in motion-safe:fade-in [animation-duration:150ms]"
        />
      )}

      {/* Sheet still downloading: a quiet orange sweep along the bottom
          edge says "frames incoming" */}
      {isSheetLoading && (
        <div className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden bg-white/10">
          <div className="h-full w-1/3 bg-accent/70 motion-safe:animate-[scrub-loading_1.1s_ease-in-out_infinite] motion-reduce:w-full motion-reduce:bg-accent/30" />
        </div>
      )}

      {duration > 0 && (
        <span
          // Remount on mode switch so imperative scrub text resets
          // cleanly; the chrome is identical in both modes, so the swap
          // is invisible — only the timecode changes.
          key={showScrubUi ? "scrub" : "idle"}
          ref={badgeRef}
          className="absolute bottom-2.5 right-2.5 rounded-[5px] bg-black/85 px-1.5 py-0.5 font-heading text-xs font-semibold text-white"
        >
          {formatDuration(duration)}
        </span>
      )}

      {/* Local watch progress along the thumb's bottom edge (steps aside
          while the scrub playhead owns that edge) */}
      {progress > 0.01 && !showScrubUi && (
        <div
          className="absolute inset-x-0 bottom-0 h-[3px] bg-white/20"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Watch progress"
        >
          <div
            className="h-full bg-accent"
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
