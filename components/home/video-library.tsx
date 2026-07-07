"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import type { Video } from "@boldvideo/bold-js";
import { cn } from "@/lib/utils";
import { buildVideoUrl } from "@/lib/video-path";

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
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
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

function EpisodeCard({ video }: { video: Video }) {
  const blurb = video.teaser || video.description || "";
  const tags = normalizeTags(video.tags).slice(0, 2);

  return (
    <li className="flex">
      <Link
        href={buildVideoUrl(video)}
        prefetch
        className="flex flex-col w-full bg-background hover:bg-muted transition-colors"
      >
        <div className="relative aspect-video overflow-hidden border-b border-foreground/10 bg-black">
          {video.thumbnail && (
            <Image
              src={video.thumbnail}
              alt={video.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="object-cover"
            />
          )}
          {video.duration > 0 && (
            <span className="absolute right-2 bottom-2 font-mono text-[11px] bg-black/80 text-white px-1.5 py-0.5 rounded">
              {formatDuration(video.duration)}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2 p-4 flex-1">
          <h3 className="font-[family-name:var(--font-heading)] font-semibold text-lg leading-tight tracking-tight">
            {video.title}
          </h3>
          {blurb && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {blurb}
            </p>
          )}
          <div className="flex items-center gap-2 mt-auto pt-1.5">
            {tags.map((tag) => (
              <span
                key={tag.slug}
                className="font-mono text-[10.5px] tracking-[0.03em] text-muted-foreground border border-border rounded px-1.5 py-0.5"
              >
                {tag.name}
              </span>
            ))}
            {video.publishedAt && (
              <span className="ml-auto font-mono text-[11px] text-muted-foreground/70">
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
export function VideoLibrary({ initialVideos, title, subtitle }: VideoLibraryProps) {
  const pageSize = initialVideos.length;
  const [videos, setVideos] = useState<Video[]>(initialVideos);
  const [page, setPage] = useState(1);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(pageSize > 0);

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

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
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
        <p className="text-xs font-semibold tracking-[0.1em] uppercase text-muted-foreground/70 mb-3 ml-1">
          Topics
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
      </aside>

      {/* Main */}
      <main className="px-5 pt-6 pb-16 md:px-8 md:pt-8 min-w-0">
        <div className="mb-6">
          <h1 className="font-[family-name:var(--font-heading)] font-bold text-3xl md:text-4xl tracking-tight leading-none">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-2.5">{subtitle}</p>
          )}
        </div>

        {/* Topic chips (mobile) */}
        <div className="lg:hidden flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 mb-5">
          <TopicButton
            label="All"
            active={activeTopic === null}
            onClick={() => selectTopic(null)}
            compact
          />
          {topics.map((t) => (
            <TopicButton
              key={t.slug}
              label={t.label}
              active={activeTopic === t.slug}
              onClick={() => selectTopic(t.slug)}
              compact
            />
          ))}
        </div>

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

        {isFiltering ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : videos.length > 0 ? (
          // Hairline grid — lines keyed to foreground so they stay visible
          // regardless of how close the tenant's border/surface tokens are
          <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-px bg-foreground/10 border border-foreground/10 rounded-xl overflow-hidden">
            {videos.map((video) => (
              <EpisodeCard key={video.id} video={video} />
            ))}
          </ul>
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
      </main>
    </div>
  );
}
