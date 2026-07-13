"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { formatDuration } from "util/format-duration";
import { buildVideoUrl } from "@/lib/video-path";
import { cn } from "@/lib/utils";
import type { Video } from "@boldvideo/bold-js";

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

interface ScrubOverlayProps {
  video: Video;
  playlistId?: string;
  /** Render the resting duration badge (off when a completion check shows instead). */
  showDuration?: boolean;
}

/**
 * Scrub-on-hover for video thumbnails: sweeping the pointer across the thumb
 * scrubs through the video via its Mux storyboard (one sheet for all frames).
 * On touch, long-press then drag scrubs; release keeps the frame and the
 * "▶ time" badge is the explicit commit tap. Renders as an absolute overlay
 * inside the thumbnail's relative container. React state only gates mount;
 * per-mousemove updates write styles directly so scrubbing never re-renders.
 */
export function ScrubOverlay({
  video,
  playlistId,
  showDuration = true,
}: ScrubOverlayProps) {
  const router = useRouter();
  // storyboard: undefined = still loading, null = unavailable.
  const [storyboard, setStoryboard] = useState<Storyboard | null | undefined>(
    undefined
  );
  const [hovering, setHovering] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const playheadRef = useRef<HTMLDivElement | null>(null);
  const badgeRef = useRef<HTMLSpanElement | null>(null);
  const playbackId = (video as { playbackId?: string }).playbackId;

  const applyFrac = useCallback(
    (sb: Storyboard | null | undefined, frac: number) => {
      // Playhead + timecode respond instantly (they only need the video
      // duration); frames join once the sheet has loaded.
      const seconds = frac * (sb?.duration ?? video.duration ?? 0);
      if (playheadRef.current) {
        playheadRef.current.style.left = `${frac * 100}%`;
      }
      if (badgeRef.current) {
        badgeRef.current.textContent = `▶ ${formatDuration(Math.floor(seconds))}`;
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
    [video.duration]
  );

  const lastFracRef = useRef(0);
  const storyboardRef = useRef<Storyboard | null | undefined>(undefined);
  useEffect(() => {
    storyboardRef.current = storyboard;
  }, [storyboard]);

  const handleEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!playbackId) return;
      if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches)
        return;
      loadStoryboard(playbackId).then((sb) => setStoryboard(sb));
      const rect = e.currentTarget.getBoundingClientRect();
      lastFracRef.current = Math.min(
        1,
        Math.max(0, (e.clientX - rect.left) / rect.width)
      );
      setHovering(true);
    },
    [playbackId]
  );

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (storyboard === null) return; // no storyboard available for this video
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

  // ── Touch: long-press (350ms) then drag horizontally to scrub; release
  // keeps the preview and the badge commits. A quick tap still navigates
  // normally, and moving before the long-press fires means scrolling wins.
  const touchRef = useRef<{
    timer: number | null;
    startX: number;
    startY: number;
    active: boolean;
    suppressClick: boolean;
  }>({ timer: null, startX: 0, startY: 0, active: false, suppressClick: false });
  const dismissTimerRef = useRef<number | null>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!playbackId || e.touches.length !== 1) return;
      loadStoryboard(playbackId).then((sb) => setStoryboard(sb));
      const t = e.touches[0];
      const state = touchRef.current;
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      state.startX = t.clientX;
      state.startY = t.clientY;
      state.suppressClick = false;
      if (state.timer) clearTimeout(state.timer);
      state.timer = window.setTimeout(() => {
        state.timer = null;
        state.active = true;
        (navigator as Navigator & { vibrate?: (ms: number) => void }).vibrate?.(10);
        const el = overlayRef.current;
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
    [playbackId]
  );

  const handleTouchEnd = useCallback(() => {
    const state = touchRef.current;
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
    if (state.active) {
      // Release keeps the scrubbed frame + a tappable "▶ time" badge as the
      // explicit commit step — no accidental deep links on lift-off.
      state.active = false;
      state.suppressClick = true;
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = window.setTimeout(
        () => setHovering(false),
        4000
      );
    }
  }, []);

  // Jump to the scrubbed moment — the badge is the commit affordance on
  // both desktop (click while scrubbing) and touch (tap after release).
  const handleScrubJump = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      const sb = storyboardRef.current;
      const seconds = Math.floor(
        lastFracRef.current * (sb?.duration || video.duration || 0)
      );
      router.push(buildVideoUrl(video, { time: seconds, playlistId }));
    },
    [router, video, playlistId]
  );

  // The overlay sits above the card's stretched title link, so plain clicks
  // must keep navigating to the video (ghost clicks after a touch scrub are
  // swallowed).
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (touchRef.current.suppressClick) {
        e.preventDefault();
        e.stopPropagation();
        touchRef.current.suppressClick = false;
        return;
      }
      router.push(buildVideoUrl(video, { playlistId }));
    },
    [router, video, playlistId]
  );

  // Native non-passive touchmove: React's synthetic handler can't
  // preventDefault, and we must beat scrolling while scrubbing.
  useEffect(() => {
    const el = overlayRef.current;
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
      ref={overlayRef}
      className="absolute inset-0 z-20 select-none [-webkit-touch-callout:none] cursor-pointer"
      onMouseEnter={handleEnter}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onClick={handleClick}
      onContextMenu={(e) => {
        if (touchRef.current.active || touchRef.current.timer)
          e.preventDefault();
      }}
    >
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

      {/* Playhead — live as soon as the pointer scrubs */}
      {showScrubUi && (
        <div ref={playheadRef} className="absolute inset-y-0 w-px bg-white/70" />
      )}

      {/* Sheet still downloading: a quiet sweep along the bottom edge
          (same edge as watch progress) says "frames incoming" */}
      {isSheetLoading && (
        <div className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden bg-white/10">
          <div className="h-full w-1/3 bg-primary/70 motion-safe:animate-[scrub-loading_1.1s_ease-in-out_infinite] motion-reduce:w-full motion-reduce:bg-primary/30" />
        </div>
      )}

      {video.duration > 0 && (showScrubUi || showDuration) && (
        <span
          // Remount on mode switch so imperative scrub text resets cleanly
          key={showScrubUi ? "scrub" : "idle"}
          ref={badgeRef}
          role={showScrubUi ? "button" : undefined}
          title={showScrubUi ? "Play from here" : undefined}
          onClick={showScrubUi ? handleScrubJump : undefined}
          className={cn(
            "absolute bottom-3 right-3 rounded-md",
            showScrubUi
              ? "px-2 py-1 font-mono text-[11px] bg-black text-primary cursor-pointer border border-primary/40 hover:bg-primary hover:text-primary-foreground transition-colors"
              : "px-2 py-1 font-semibold text-sm bg-black text-white"
          )}
        >
          {formatDuration(video.duration)}
        </span>
      )}
    </div>
  );
}
