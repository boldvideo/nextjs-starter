"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import type { Video } from "@boldvideo/bold-js";
import { cn } from "@/lib/utils";
import { buildVideoUrl } from "@/lib/video-path";
import { useSettings } from "@/components/providers/settings-provider";
import { getTenantId } from "@/lib/progress/tenant";
import { getAllProgress, isIndexedDBDefined } from "@/lib/progress/store";
import { PoweredByBold } from "@/components/powered-by-bold";
import { Wordmark } from "@/components/wordmark";
import { HeaderSearch } from "@/components/header-search";

// Tags arrive from the API as objects ({ id, name, slug }) even though the
// SDK types them as string[]. Normalize either shape.
function normalizeTags(tags: unknown): Array<{ name: string; slug: string }> {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((t) => {
      if (typeof t === "string") return { name: t, slug: t };
      if (t && typeof t === "object") {
        const o = t as { name?: string; slug?: string };
        const name = o.name || o.slug || "";
        return { name, slug: o.slug || name };
      }
      return { name: "", slug: "" };
    })
    .filter((t) => t.name);
}

// TODO(tags): topics are mocked until tag generation ships for this library.
// Once videos carry tags, the derived list below takes over automatically and
// this constant can be deleted. Filtering is already wired to the real
// `tag` param on /api/videos, so a mocked topic with no tagged videos will
// show the empty state rather than break.
const MOCK_TOPICS: string[] = [
  "Agents",
  "RAG",
  "Evals",
  "Prompting",
  "Tool calls",
  "Code gen",
];

interface VideoLibraryProps {
  initialVideos: Video[];
  title: string;
  subtitle?: string;
}

async function fetchVideos(page: number, tag: string | null): Promise<Video[]> {
  const params = new URLSearchParams({ page: String(page) });
  if (tag) params.set("tag", tag);
  const res = await fetch(`/api/videos?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch videos");
  const json = (await res.json()) as { data?: Video[] };
  return json.data ?? [];
}

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TopicButton({
  label,
  count,
  active,
  onClick,
  compact = false,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-between gap-2 whitespace-nowrap text-left",
        "rounded-lg border border-transparent text-sm cursor-pointer",
        "transition-colors",
        compact ? "px-3 py-1.5" : "px-2.5 py-[7px] w-full",
        active
          ? "bg-primary/10 text-foreground border-primary/30"
          : "text-muted-foreground hover:text-primary hover:bg-[var(--bg-tertiary)]"
      )}
    >
      <span>{label}</span>
      {count != null && (
        <span
          className={cn(
            "font-mono text-[11px]",
            active ? "text-primary" : "text-muted-foreground/70"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

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

function EpisodeCard({
  video,
  progress,
}: {
  video: Video;
  /** Furthest-watched fraction (0..1) from local playback progress. */
  progress?: number;
}) {
  // One chip per card: two long topics truncate mid-word and every card
  // ends up ragged — a single full label keeps the meta rows harmonic.
  const tags = normalizeTags(video.tags).slice(0, 1);

  // Scrub-on-hover: sweeping the pointer across the thumbnail scrubs
  // through the episode via the Mux storyboard (one image for all frames).
  // React state only gates mount (loaded / hovering); per-mousemove updates
  // write styles directly so scrubbing never re-renders the card.
  // storyboard: undefined = still loading, null = unavailable.
  const [storyboard, setStoryboard] = useState<Storyboard | null | undefined>(
    undefined
  );
  const [hovering, setHovering] = useState(false);
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
    [video.duration]
  );

  const handleEnter = useCallback(() => {
    if (!playbackId) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches)
      return;
    loadStoryboard(playbackId).then((sb) => setStoryboard(sb));
  }, [playbackId]);

  const lastFracRef = useRef(0);

  const handleThumbEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      handleEnter();
      if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        const rect = e.currentTarget.getBoundingClientRect();
        lastFracRef.current = Math.min(
          1,
          Math.max(0, (e.clientX - rect.left) / rect.width)
        );
        setHovering(true);
      }
    },
    [handleEnter]
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

  // ── Touch: long-press (350ms) then drag horizontally to scrub a preview;
  // release dismisses it. A quick tap still navigates normally, and moving
  // before the long-press fires means scrolling wins.
  const thumbRef = useRef<HTMLDivElement | null>(null);
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
      loadStoryboard(playbackId).then((sb) => setStoryboard(sb));
      const t = e.touches[0];
      const state = touchRef.current;
      state.startX = t.clientX;
      state.startY = t.clientY;
      state.suppressClick = false;
      if (state.timer) clearTimeout(state.timer);
      state.timer = window.setTimeout(() => {
        state.timer = null;
        state.active = true;
        (navigator as Navigator & { vibrate?: (ms: number) => void }).vibrate?.(10);
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
    [playbackId]
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
    <li className="flex">
      <Link
        href={buildVideoUrl(video)}
        prefetch
        className="group flex flex-col w-full"
        // Warm the storyboard as soon as the pointer touches the card —
        // buys the sheet download time before the thumb is hovered
        onMouseEnter={handleEnter}
        onClickCapture={handleClickCapture}
      >
        <div
          ref={thumbRef}
          className="relative aspect-video overflow-hidden border border-border bg-black select-none [-webkit-touch-callout:none]"
          onMouseEnter={handleThumbEnter}
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onContextMenu={(e) => {
            if (touchRef.current.active || touchRef.current.timer)
              e.preventDefault();
          }}
        >
          {video.thumbnail && (
            <Image
              src={video.thumbnail}
              alt={video.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="object-cover"
            />
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

          {/* Sheet still downloading: a quiet teal sweep along the bottom
              edge (same edge as watch progress) says "frames incoming" */}
          {isSheetLoading && (
            <div className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden bg-white/10">
              <div className="h-full w-1/3 bg-primary/70 motion-safe:animate-[scrub-loading_1.1s_ease-in-out_infinite] motion-reduce:w-full motion-reduce:bg-primary/30" />
            </div>
          )}

          {video.duration > 0 && (
            <span
              // Remount on mode switch so imperative scrub text resets
              // cleanly; the chrome is identical in both modes, so the swap
              // is invisible — only the timecode changes.
              key={showScrubUi ? "scrub" : "idle"}
              ref={badgeRef}
              className="absolute right-2 bottom-2 font-mono text-[11px] px-1.5 py-0.5 bg-black/80 text-white"
            >
              {formatDuration(video.duration)}
            </span>
          )}

          {/* Local watch progress along the thumb's bottom edge */}
          {progress != null && progress > 0.01 && !showScrubUi && (
            <div
              className="absolute inset-x-0 bottom-0 h-[3px] bg-white/20"
              role="progressbar"
              aria-valuenow={Math.round(progress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Watch progress"
            >
              <div
                className="h-full bg-primary"
                style={{ width: `${Math.min(100, progress * 100)}%` }}
              />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5 pt-3 flex-1">
          <h3 className="font-[family-name:var(--font-heading)] font-semibold text-lg leading-tight tracking-tight group-hover:text-primary transition-colors duration-150">
            {video.title}
          </h3>
          {/* No teaser line — title, chips, and date carry the card */}
          {/* Meta row: chips never wrap internally, date never breaks */}
          <div className="flex items-center gap-2 mt-auto pt-2 min-w-0">
            {tags.map((tag) => (
              <span
                key={tag.slug}
                className="font-mono text-[11px] tracking-[0.03em] text-muted-foreground border border-border px-1.5 py-0.5 whitespace-nowrap truncate min-w-0 max-w-[70%]"
              >
                {tag.name}
              </span>
            ))}
            {video.publishedAt && (
              <span className="ml-auto shrink-0 whitespace-nowrap font-mono text-[11px] text-muted-foreground/70">
                {formatDate(video.publishedAt)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

/**
 * Homepage library: topic rail + dense episode grid with "Load more"
 * pagination. The backend controls page size and returns no total count, so
 * the first page's length doubles as the page-size guess: a page that comes
 * back shorter than it means we've reached the end.
 */
// `title` is accepted for API compatibility; the hero renders the fixed
// brand lockup instead of the tenant channel name.
export function VideoLibrary({ initialVideos, subtitle }: VideoLibraryProps) {
  const pageSize = initialVideos.length;
  const [videos, setVideos] = useState<Video[]>(initialVideos);
  const [page, setPage] = useState(1);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(pageSize > 0);
  // The backend returns no total count, so the next page is probed in the
  // background: an empty probe hides "Load more", a full one makes the
  // click instant.
  const nextPageRef = useRef<Video[] | null>(null);
  const videoIdsRef = useRef<Set<string>>(new Set());
  const settings = useSettings();

  // Locally stored watch progress (IndexedDB), videoId → fraction watched,
  // plus the in-flight (started, not finished) records for Continue watching.
  const [progressById, setProgressById] = useState<Map<string, number>>(
    () => new Map()
  );
  const [resumeRecords, setResumeRecords] = useState<
    { videoId: string; position: number; fraction: number; lastWatched: string }[]
  >([]);
  useEffect(() => {
    if (!isIndexedDBDefined()) return;
    const tenantId = getTenantId(settings);
    if (!tenantId) return;
    let cancelled = false;
    getAllProgress(tenantId)
      .then((records) => {
        if (cancelled) return;
        const next = new Map<string, number>();
        const resume: typeof resumeRecords = [];
        for (const r of records) {
          if (r.duration > 0) {
            const fraction = Math.min(1, r.furthestPosition / r.duration);
            next.set(r.videoId, fraction);
            if (!r.completed && fraction > 0.01 && r.position > 15) {
              resume.push({
                videoId: r.videoId,
                position: Math.floor(r.position),
                fraction,
                lastWatched: r.lastWatched,
              });
            }
          }
        }
        resume.sort((a, b) => b.lastWatched.localeCompare(a.lastWatched));
        setProgressById(next);
        setResumeRecords(resume.slice(0, 8));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [settings]);

  // Continue watching needs video metadata — resolve against loaded videos.
  const resumeItems = useMemo(
    () =>
      resumeRecords
        .map((r) => ({
          ...r,
          video: initialVideos.find((v) => v.id === r.videoId),
        }))
        .filter((r): r is typeof r & { video: Video } => !!r.video)
        .slice(0, 6),
    [resumeRecords, initialVideos]
  );

  // Prefer real tags carried by the loaded videos (with counts); fall back
  // to the mock list until tags are generated.
  const topics = useMemo(() => {
    const bySlug = new Map<string, { label: string; slug: string; count: number }>();
    for (const v of initialVideos) {
      for (const t of normalizeTags(v.tags)) {
        const entry = bySlug.get(t.slug);
        if (entry) entry.count += 1;
        else bySlug.set(t.slug, { label: t.name, slug: t.slug, count: 1 });
      }
    }
    if (bySlug.size > 0) {
      return Array.from(bySlug.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((t) => ({ ...t, count: t.count as number | undefined }));
    }
    return MOCK_TOPICS.map((label) => ({
      label,
      slug: label,
      count: undefined,
    }));
  }, [initialVideos]);

  // Prewarm storyboards for the above-the-fold cards once the page is idle,
  // so the very first hover scrubs instantly. Hover-capable pointers only,
  // and skipped entirely for data-saver users.
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches)
      return;
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    if (connection?.saveData) return;

    const warm = () => {
      for (const v of initialVideos.slice(0, 6)) {
        const pid = (v as { playbackId?: string }).playbackId;
        if (pid) loadStoryboard(pid);
      }
    };
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const id = w.requestIdleCallback
      ? w.requestIdleCallback(warm, { timeout: 4000 })
      : window.setTimeout(warm, 2500);
    return () => {
      if (w.cancelIdleCallback) w.cancelIdleCallback(id as number);
      else clearTimeout(id as number);
    };
  }, [initialVideos]);

  const appendUnique = (existing: Video[], incoming: Video[]) => {
    const seen = new Set(existing.map((v) => v.id));
    return [...existing, ...incoming.filter((v) => !seen.has(v.id))];
  };

  const selectTopic = useCallback(
    async (topic: string | null) => {
      setActiveTopic(topic);
      setIsFiltering(true);
      setPage(1);
      try {
        const data = topic === null ? initialVideos : await fetchVideos(1, topic);
        setVideos(data);
        setHasMore(data.length > 0 && data.length >= pageSize);
      } catch {
        setVideos([]);
        setHasMore(false);
      } finally {
        setIsFiltering(false);
      }
    },
    [initialVideos, pageSize]
  );

  // Probe the page after the current one whenever the list advances. Runs
  // after mount too, so a first page that already holds every episode
  // never shows a dead "Load more".
  useEffect(() => {
    videoIdsRef.current = new Set(videos.map((v) => v.id));
  }, [videos]);
  useEffect(() => {
    if (!hasMore || isFiltering) return;
    let cancelled = false;
    nextPageRef.current = null;
    fetchVideos(page + 1, activeTopic)
      .then((data) => {
        if (cancelled) return;
        const fresh = data.filter((v) => !videoIdsRef.current.has(v.id));
        if (fresh.length === 0) setHasMore(false);
        else nextPageRef.current = fresh;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [page, activeTopic, hasMore, isFiltering]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    const nextPage = page + 1;
    // Prefetched probe makes this instant; fall back to a live fetch if
    // the probe hasn't landed yet.
    if (nextPageRef.current) {
      setVideos((prev) => appendUnique(prev, nextPageRef.current!));
      nextPageRef.current = null;
      setPage(nextPage);
      return;
    }
    setIsLoadingMore(true);
    try {
      const data = await fetchVideos(nextPage, activeTopic);
      setVideos((prev) => appendUnique(prev, data));
      setPage(nextPage);
      setHasMore(data.length >= pageSize && data.length > 0);
    } catch {
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeTopic, hasMore, isLoadingMore, page, pageSize]);

  const episodeCount = videos.length;

  return (
    <div className="lg:grid lg:grid-cols-[248px_1fr] max-w-[1280px] mx-auto">
      {/* Topic rail (desktop) */}
      <aside className="hidden lg:block border-r border-border pt-8 pr-5 pb-8 pl-6 sticky top-[var(--header-height)] self-start">
        <p className="font-scribble mb-2 ml-1 rotate-[-2deg] text-xl text-[var(--warning)]">
          topics
        </p>
        <div className="flex flex-col gap-0.5">
          <TopicButton
            label="All episodes"
            count={activeTopic === null ? episodeCount : undefined}
            active={activeTopic === null}
            onClick={() => selectTopic(null)}
          />
          {topics.map((t) => (
            <TopicButton
              key={t.slug}
              label={t.label}
              count={t.count}
              active={activeTopic === t.slug}
              onClick={() => selectTopic(t.slug)}
            />
          ))}
        </div>
        <div className="mt-8 border-t border-border pt-4 ml-1">
          <PoweredByBold />
        </div>
      </aside>

      {/* Main */}
      <main className="px-5 pt-6 pb-16 md:px-8 md:pt-8 min-w-0">
        <div className="mb-8">
          {/* Hero mirrors the original boundaryml.com/podcast headline;
              search + ask ride to its right on desktop */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            <h1>
              <Wordmark className="text-[clamp(2.5rem,5vw,4rem)] leading-[1.02]" />
            </h1>
            <div className="shrink-0 lg:pt-2">
              <Suspense>
                <HeaderSearch className="w-full max-w-xs" />
              </Suspense>
            </div>
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-2.5">{subtitle}</p>
          )}

          {/* Nudge into the core loop: any of these can be asked about */}
          <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-2">
            <span className="font-scribble rotate-[-1deg] text-lg text-[var(--warning)]">
              don&rsquo;t scrub through 34 hours —
            </span>
            <Link
              href="/ask"
              className="text-sm font-semibold decoration-accent decoration-[2.5px] underline-offset-4 hover:underline"
            >
              just ask Taki AI →
            </Link>
          </div>
        </div>

        {/* Topic chips (mobile) — snap scrolling with soft edge fades */}
        <div className="lg:hidden flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 mb-5 snap-x [mask-image:linear-gradient(to_right,transparent,black_20px,black_calc(100%-20px),transparent)]">
          <div className="snap-start shrink-0">
            <TopicButton
              label="All"
              active={activeTopic === null}
              onClick={() => selectTopic(null)}
              compact
            />
          </div>
          {topics.map((t) => (
            <div key={t.slug} className="snap-start shrink-0">
              <TopicButton
                label={t.label}
                active={activeTopic === t.slug}
                onClick={() => selectTopic(t.slug)}
                compact
              />
            </div>
          ))}
        </div>

        {/* Continue watching — local progress, most recent first */}
        {activeTopic === null && resumeItems.length > 0 && (
          <section className="mb-10">
            <p className="text-xs font-semibold tracking-[0.1em] uppercase text-muted-foreground/70 mb-3">
              Continue watching
            </p>
            <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x -mx-5 px-5 md:-mx-8 md:px-8 [mask-image:linear-gradient(to_right,transparent,black_20px,black_calc(100%-20px),transparent)]">
              {resumeItems.map(({ video, position, fraction }) => (
                <Link
                  key={video.id}
                  href={buildVideoUrl(video, { time: position })}
                  className="group snap-start shrink-0 w-[220px]"
                >
                  <div className="relative aspect-video overflow-hidden border border-border bg-black">
                    {video.thumbnail && (
                      <Image
                        src={video.thumbnail}
                        alt={video.title}
                        fill
                        sizes="220px"
                        className="object-cover"
                      />
                    )}
                    {video.duration > position && (
                      <span className="absolute right-2 bottom-2 font-mono text-[11px] bg-black/80 text-white px-1.5 py-0.5">
                        {formatDuration(video.duration - position)} left
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/20">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.min(100, fraction * 100)}%` }}
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-sm font-medium leading-snug line-clamp-1 group-hover:text-primary transition-colors duration-150">
                    {video.title}
                  </p>
                  <p className="font-mono text-[11px] text-muted-foreground/70 mt-0.5">
                    Resume at {formatDuration(position)}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-5 text-xs text-muted-foreground">
          <span className="font-mono text-foreground">{episodeCount}</span>
          <span>{episodeCount === 1 ? "episode" : "episodes"}</span>
          {activeTopic && (
            <span>
              · {topics.find((t) => t.slug === activeTopic)?.label ?? activeTopic}
            </span>
          )}
        </div>

        {videos.length > 0 ? (
          // Spacing-based grid: the rounded thumbnail is the only bounded
          // surface; text hangs free below it. While a topic filter loads,
          // the previous grid stays mounted (dimmed) so the page keeps its
          // height and the topic rail doesn't jump.
          <ul
            aria-busy={isFiltering}
            className={cn(
              "grid sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-10",
              isFiltering &&
                "opacity-40 pointer-events-none transition-opacity duration-150"
            )}
          >
            {videos.map((video) => (
              <EpisodeCard
                key={video.id}
                video={video}
                progress={progressById.get(video.id)}
              />
            ))}
          </ul>
        ) : isFiltering ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <p className="py-16 text-center text-muted-foreground">
            No videos for this topic yet.
          </p>
        )}

        {/* Load more */}
        {!isFiltering && videos.length > 0 && hasMore && (
          <div className="flex justify-center mt-10">
            <button
              type="button"
              onClick={loadMore}
              disabled={isLoadingMore}
              className={cn(
                "inline-flex items-center gap-2 px-6 py-2.5 rounded-full",
                "text-sm font-medium border border-border",
                "hover:bg-muted transition-colors cursor-pointer",
                "disabled:opacity-60 disabled:cursor-default"
              )}
            >
              {isLoadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        )}

        {/* Attribution (mobile — desktop shows it in the rail) */}
        <div className="lg:hidden flex justify-center mt-10">
          <PoweredByBold />
        </div>
      </main>
    </div>
  );
}
