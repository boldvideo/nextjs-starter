"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { format } from "date-fns";
import { ArrowDown, ArrowUp, ChevronRight, Play, Search, Share2, X } from "lucide-react";
import type { Settings } from "@boldvideo/bold-js";
import { Player } from "@/components/players";
import { AIAssistant } from "@/components/video/chat";
import { AIAssistantProvider } from "@/components/video/chat/context";
import { Breadcrumb } from "@/components/providers/breadcrumb-provider";
import { getPortalConfig } from "@/lib/portal-config";
import { cn } from "@/lib/utils";
import type { ExtendedVideo } from "@/types/video-detail";
import type { EpisodeContent, Moment, Person } from "@/lib/shiftai/episode";
import type { Brief } from "@/lib/shiftai/briefs";
import { Face as Headshot } from "./face";
import type { Chapter, Paragraph } from "@/lib/shiftai/episode-data";
import { formatStamp, stampToSeconds } from "@/lib/shiftai/time";
import { viewerProfile } from "@/lib/shiftai/profile";
import { CompanyDetectStrip, CompanySeat, CompanyUrlBox, ComposerCompanyPill, useCompanyProfile } from "./company";
import { useAIAssistantContext } from "@/components/video/chat/context";
import { track } from "@/lib/shiftai/track";

const GREEN = "#E8FF47";
const NAVY = "#1A1A17";
const SPEAKER_COLORS = ["#F4F2EC", "#E8FF47", "#47C4FF", "#FF6B47", "#A3A39B"];

type Tab = "transcript" | "ask" | "chapters" | "moments";

/** lg breakpoint; the rail exists only above it. Defaults to desktop for SSR. */
function useIsDesktop() {
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return desktop;
}

interface EpisodePageProps {
  video: ExtendedVideo;
  settings: Settings | null;
  episode: EpisodeContent | null;
  paragraphs: Paragraph[];
  chapters: Chapter[];
  moments?: Moment[];
  brief?: Brief | null;
  /** The show's own runtime, for when Bold has not measured the video yet. */
  durationHint?: number;
  startTime?: number;
}

function Face({ person, size = 40 }: { person?: Person; size?: number }) {
  if (!person) return null;
  return <Headshot slug={person.slug} name={person.name} size={size} />;
}

/** A timestamp always looks like what it does: a small "play from here" pill. */
function PlayPill({ at, filled = false }: { at: string; filled?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[2px] border px-2 py-1 font-mono text-[11px] tracking-[0.08em] tabular-nums leading-none transition-colors duration-150",
        filled ? "border-acid bg-acid text-[#0a0a08]" : "border-border bg-transparent text-acid"
      )}
    >
      <Play className="h-2.5 w-2.5 fill-current" aria-hidden="true" />
      {at}
    </span>
  );
}

function Stamp({ at, onSeek, className }: { at?: string | null; onSeek: (s: number) => void; className?: string }) {
  const s = stampToSeconds(at);
  if (s === null || !at) return null;
  return (
    <button
      type="button"
      onClick={() => onSeek(s)}
      aria-label={`Play from ${at}`}
      className={cn(
        "group/stamp align-middle rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid focus-visible:ring-offset-2 focus-visible:ring-offset-background [&>span]:hover:border-acid [&>span]:hover:bg-acid [&>span]:hover:text-[#0a0a08] active:scale-[0.97] transition-transform",
        className
      )}
    >
      <PlayPill at={at} />
    </button>
  );
}

export function EpisodePage({ video, settings, episode, paragraphs, chapters, moments = [], brief = null, durationHint, startTime }: EpisodePageProps) {
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const ai = getPortalConfig(settings).ai;

  const [tab, setTab] = useState<Tab>("transcript");
  const [now, setNow] = useState(0);
  const [follow, setFollow] = useState(true);
  const [query, setQuery] = useState("");
  const [company] = useCompanyProfile();
  const [urlMode, setUrlMode] = useState(false);
  const isDesktop = useIsDesktop();

  const skipScroll = useRef(false);
  const seekTarget = useRef<{ t: number; until: number } | null>(null);
  const seek = useCallback((t: number, opts?: { fromTranscript?: boolean }) => {
    const p = playerRef.current;
    if (!p) return;
    p.currentTime = t;
    void p.play?.();
    // The player reports its new time a beat later; without this the follow
    // scroll would chase the old position first.
    setNow(t);
    seekTarget.current = { t, until: Date.now() + 2500 };
    skipScroll.current = !!opts?.fromTranscript;
    setFollow(true);
  }, []);

  // Track playback for the active paragraph and chapter.
  useEffect(() => {
    let raf = 0;
    const id = window.setInterval(() => {
      const t = playerRef.current?.currentTime ?? 0;
      // Right after a seek the YouTube player still reports the old time for a
      // moment; ignore readings that aren't near the target until it catches up.
      const target = seekTarget.current;
      if (target) {
        if (Math.abs(t - target.t) < 3 || Date.now() > target.until) seekTarget.current = null;
        else return;
      }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setNow(t));
    }, 500);
    return () => {
      window.clearInterval(id);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (startTime && playerRef.current) playerRef.current.currentTime = startTime;
  }, [startTime]);

  const people = useMemo(() => {
    const list = [...(episode?.host ? [episode.host] : []), ...(episode?.guest ? [episode.guest] : [])];
    return new Map(list.map((p) => [p.name, p] as const));
  }, [episode]);

  const speakerColor = useMemo(() => {
    const order: string[] = [];
    for (const p of paragraphs) if (!order.includes(p.speaker)) order.push(p.speaker);
    return (name: string) => SPEAKER_COLORS[Math.max(0, order.indexOf(name)) % SPEAKER_COLORS.length];
  }, [paragraphs]);

  const activeIndex = useMemo(() => {
    let i = -1;
    for (let k = 0; k < paragraphs.length; k++) {
      if (paragraphs[k].start <= now + 0.25) i = k;
      else break;
    }
    return i;
  }, [paragraphs, now]);

  const activeChapter = useMemo(() => {
    let i = -1;
    chapters.forEach((c, k) => {
      if (c.start <= now + 0.25) i = k;
    });
    return i;
  }, [chapters, now]);

  // Follow mode scrolls the transcript box, never the window, and only when the
  // active paragraph changes. Any scroll the reader makes in the box stops it.
  const listRef = useRef<HTMLDivElement | null>(null);
  const programmaticUntil = useRef(0);
  useEffect(() => {
    if (!follow || tab !== "transcript" || activeIndex < 0) return;
    if (skipScroll.current) {
      // The reader clicked this paragraph; it is already where they are looking.
      skipScroll.current = false;
      return;
    }
    const box = listRef.current;
    const el = box?.querySelector<HTMLElement>(`[data-p="${activeIndex}"]`);
    if (!box || !el) return;
    // Position inside the box's scroll area (the box is the offsetParent).
    const elTop = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
    const visibleTop = elTop - box.scrollTop;
    const comfortable =
      visibleTop >= 0 && visibleTop + Math.min(el.offsetHeight, box.clientHeight * 0.4) <= box.clientHeight * 0.8;
    // Leave the reader alone while the playing paragraph is comfortably in view.
    if (comfortable) return;
    programmaticUntil.current = Date.now() + 900;
    box.scrollTo({ top: Math.max(0, elTop - box.clientHeight / 4), behavior: "smooth" });
  }, [activeIndex, follow, tab]);

  const onListScroll = useCallback(() => {
    if (Date.now() > programmaticUntil.current) setFollow(false);
  }, []);

  const barRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Mini player: while the video plays and its spot has scrolled away, the
  // player pins to the rail's top (desktop) or the top of the screen (phone).
  // The player element never moves in the DOM (a YouTube iframe would reload);
  // its shell switches to position: fixed over a slot, and back.
  const placeholderRef = useRef<HTMLDivElement | null>(null);
  const slotRef = useRef<HTMLDivElement | null>(null);
  const dismissed = useRef(false);
  const [mini, setMini] = useState(false);
  const [miniStyle, setMiniStyle] = useState<CSSProperties>({});
  const [miniH, setMiniH] = useState(0);
  const updateMini = useCallback(() => {
    const ph = placeholderRef.current;
    const sc = scrollRef.current;
    if (!ph || !sc) return;
    const out = ph.getBoundingClientRect().bottom < sc.getBoundingClientRect().top + 60;
    if (!out) dismissed.current = false;
    const playing = (playerRef.current as unknown as { paused?: boolean } | null)?.paused === false;
    setMini((m) => out && !dismissed.current && (playing || m));
  }, []);
  useEffect(() => {
    updateMini();
  }, [now, updateMini]);
  useEffect(() => {
    window.addEventListener("scroll", updateMini, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", updateMini, { capture: true });
  }, [updateMini]);
  useLayoutEffect(() => {
    if (!mini) {
      setMiniH(0);
      return;
    }
    const place = () => {
      if (isDesktop) {
        const s = slotRef.current?.getBoundingClientRect();
        if (s) setMiniStyle({ position: "fixed", top: s.top, left: s.left, width: s.width, height: s.height });
        setMiniH(0);
      } else {
        const top = scrollRef.current?.getBoundingClientRect().top ?? 0;
        const w = window.innerWidth;
        setMiniStyle({ position: "fixed", top, left: 0, width: w, height: (w * 9) / 16 });
        setMiniH(Math.round((w * 9) / 16));
      }
    };
    place();
    window.addEventListener("scroll", place, { capture: true, passive: true });
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, { capture: true });
      window.removeEventListener("resize", place);
    };
  }, [mini, isDesktop]);
  const closeMini = () => {
    dismissed.current = true;
    setMini(false);
  };
  // On phones the pinned player covers the top, so the sticky bar sits under it.
  const stickyOffset = !isDesktop && mini ? miniH : 0;
  const [docked, setDocked] = useState(false);
  const [boxHeight, setBoxHeight] = useState<string>("70vh");
  useEffect(() => {
    const measure = () => {
      const bar = barRef.current;
      const box = listRef.current;
      if (!bar || !box) return;
      // Docked = the sticky bar has reached the top of the page's scroll area.
      const top = scrollRef.current?.getBoundingClientRect().top ?? 0;
      setDocked(bar.getBoundingClientRect().top <= top + stickyOffset + 1);
      // Exactly the room left under the sticky bar, so the docked box fills the screen.
      setBoxHeight(`max(320px, calc(100dvh - var(--header-height, 57px) - ${bar.offsetHeight + stickyOffset}px - 12px))`);
    };
    measure();
    window.addEventListener("scroll", measure, { capture: true, passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, { capture: true });
      window.removeEventListener("resize", measure);
    };
  }, [tab, stickyOffset]);

  const q = query.trim().toLowerCase();
  const chapterAt = useMemo(() => {
    const map = new Map<number, Chapter>();
    let ci = 0;
    paragraphs.forEach((p, i) => {
      while (ci < chapters.length && chapters[ci].start <= p.start + 0.5) {
        if (!map.has(i)) map.set(i, chapters[ci]);
        ci++;
      }
    });
    return map;
  }, [paragraphs, chapters]);

  const number = episode ? String(episode.number).padStart(2, "0") : null;
  const published = episode?.date
    ? format(new Date(`${episode.date}T12:00:00Z`), "d MMM yyyy")
    : video.publishedAt
      ? format(new Date(video.publishedAt), "d MMM yyyy")
      : null;
  const seconds = video.duration || durationHint || 0;
  const duration = seconds ? formatDuration(seconds) : null;
  const tabs: { id: Tab; label: string; count?: string; show: boolean }[] = [
    { id: "transcript", label: "Transcript", count: duration ?? undefined, show: paragraphs.length > 0 },
    { id: "ask", label: "Ask", show: !isDesktop },
    { id: "chapters", label: "Chapters", count: String(chapters.length), show: chapters.length > 0 },
    { id: "moments", label: "Moments", count: String(moments.length), show: moments.length > 0 },
  ];

  const briefCells: { key: keyof Brief; label: string }[] = [
    { key: "move", label: "The move" },
    { key: "numbers", label: "The numbers" },
    { key: "broke", label: "What broke" },
    { key: "advice", label: "Do this week" },
  ];
  const guestFirst = episode?.guest.name.split(" ")[0];

  const chat = (
    <AIAssistant
              videoId={video.id}
              name={ai.name}
              avatar={ai.avatar}
              subdomain=""
              greeting={company?.business_name ? `Answering for ${company.business_name}. Which decision are you working on?` : ai.greeting}
              isEmbedded
              variant="panel"
              tagline="AI · not Alex · not a guest"
              placeholder={company?.business_name ? `Ask about ${company.business_name} and this episode…` : "Ask about this episode, or your own company…"}
              viewerProfile={viewerProfile(company)}
              starters={
                company?.business_name
                  ? [`How does this apply to ${company.business_name}?`, `Where is ${company.business_name} different from ${episode?.guest.company ?? "them"}?`]
                  : [
                      episode ? `What did ${guestFirst} actually change at ${episode.guest.company}?` : "What did they actually change?",
                      "Which numbers did they give?",
                    ]
              }
              composerOverride={
                urlMode ? (
                  <CompanyUrlBox className="min-h-[104px]" onCancel={() => setUrlMode(false)} onDone={() => setUrlMode(false)} />
                ) : null
              }
              composerAccessory={<ComposerCompanyPill onAdd={() => setUrlMode(true)} />}
              composerBottom={<ChatDetectStrip />}
              className="h-full"
            />
  );
  const nextCard = episode?.next?.slug && (
    <Link
      href={`/v/${episode.next.slug}`}
      className="group flex items-center gap-4 border border-border bg-surface px-4 py-4 transition-colors hover:border-acid"
    >
      <Face person={episode.next.guest} size={44} />
      <span className="min-w-0 flex-1 leading-snug">
        <span className="sx-label block !text-[10px] text-acid">Next · Episode {String(episode.next.number).padStart(2, "0")}</span>
        <span className="mt-1 block truncate text-[15px] text-foreground">
          {episode.next.guest.name}, {episode.next.guest.company}
        </span>
        <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">{episode.next.headline}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-dim transition-colors group-hover:text-acid" />
    </Link>
  );

  return (
    <AIAssistantProvider
      key={video.id}
      onTimeClick={(t) => {
        seek(t);
        const box = scrollRef.current;
        const player = box?.querySelector<HTMLElement>("main .aspect-video");
        if (box && player && player.getBoundingClientRect().bottom < box.getBoundingClientRect().top + 80) {
          box.scrollTo({ top: 0, behavior: "smooth" });
        }
        return true;
      }}
    >
      <Breadcrumb label={episode ? `${number} · ${episode.guest.name}` : video.title} />
      {/* The portal layout locks the page (main is overflow-hidden), so the episode page owns its scroll area. */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-[1360px] mx-auto px-5 md:px-7 pt-5 pb-20 lg:pb-6 flex flex-wrap gap-9 items-start">
        {/* MAIN */}
        <main className="flex-[999_1_640px] min-w-0">
          <div ref={placeholderRef} className="relative aspect-video bg-surface -mx-5 md:mx-0 rounded-none md:rounded-[2px]">
            <div
              style={mini ? miniStyle : undefined}
              className={cn(
                "bg-black overflow-hidden",
                mini
                  ? cn("z-40 shadow-[0_18px_40px_rgba(0,0,0,0.28)]", isDesktop ? "rounded-[2px]" : "rounded-none")
                  : "absolute inset-0 rounded-none md:rounded-[2px]"
              )}
            >
              <Player video={video} autoPlay={false} ref={playerRef} startTime={startTime} className="w-full h-full" />
              {mini && (
                <div className="absolute top-2 right-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
                    aria-label="Back to the video"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-[#0a0a08] hover:bg-black/80"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={closeMini}
                    aria-label="Close mini player"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-[#0a0a08] hover:bg-black/80"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <header className="mt-8">
            <p className="sx-label sx-eyebrow">
              {number ? `Episode ${number}` : "The AI Revolution Show"}
              {published && ` · ${published}`}
              {duration && ` · ${duration}`}
            </p>
            <h1 className="sx-display mt-5 text-[clamp(40px,5vw,76px)]">{episode?.headline ?? video.title}</h1>
            {episode?.hook && <p className="mt-5 max-w-3xl text-[18px] leading-[1.65] text-muted-foreground md:text-[19px]">{episode.hook}</p>}
          </header>

          {/* Cast */}
          {episode && (
            <div className="mt-7 flex items-stretch gap-3 max-sm:-mx-5 max-sm:overflow-x-auto max-sm:px-5 max-sm:pb-1 [scrollbar-width:none] sm:flex-wrap [&>*]:shrink-0">
              {[
                { p: episode.guest, role: [episode.guest.role, episode.guest.company].filter(Boolean).join(", ") },
                { p: episode.host, role: "Host · Shift AI" },
              ].map(({ p, role }) => (
                <a
                  key={p.slug}
                  href={p.companyUrl}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center gap-3 border border-border bg-surface py-2.5 pl-2.5 pr-5 transition-colors hover:border-muted-foreground"
                >
                  <Face person={p} size={44} />
                  <span className="leading-tight">
                    <span className="block text-[15px] text-foreground">{p.name}</span>
                    <span className="sx-label mt-1 block !text-[10px] text-muted-foreground">{role}</span>
                  </span>
                </a>
              ))}
              <CompanySeat />
              <span className="flex-1" />
              <button
                type="button"
                onClick={() => {
                  track("Episode share", { episode: `E${number}` });
                  navigator.share?.({ title: episode.title, url: window.location.href }).catch(() => {});
                }}
                className="sx-btn sx-btn-ghost self-center"
              >
                <Share2 className="h-3.5 w-3.5" /> Share
              </button>
            </div>
          )}

          {/* The brief: the newsletter's own shape, each cell a moment you can play */}
          {brief && (
            <section aria-labelledby="brief" className="mt-12">
              <h2 id="brief" className="sx-label sx-eyebrow">
                The brief
              </h2>
              <div className="mt-5 grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
                {briefCells.map(({ key, label }) => {
                  const cell = brief[key];
                  if (!cell?.text) return null;
                  const at = typeof cell.at === "number" ? formatStamp(cell.at) : null;
                  const body = (
                    <>
                      <span className="sx-label mb-3 block !text-[10px] text-acid">{label}</span>
                      <span className="block text-[15px] leading-[1.6] text-foreground">{cell.text}</span>
                      {at && (
                        <span className="mt-auto block pt-5 [&>span]:group-hover:border-acid [&>span]:group-hover:bg-acid [&>span]:group-hover:text-[#0a0a08]">
                          <PlayPill at={at} />
                        </span>
                      )}
                    </>
                  );
                  return at ? (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        track("Episode jump", { from: "brief", part: label, episode: `E${number}` });
                        seek(cell.at as number);
                      }}
                      aria-label={`${label}: play from ${at}`}
                      className="group flex flex-col bg-background p-5 text-left transition-colors duration-150 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-acid"
                    >
                      {body}
                    </button>
                  ) : (
                    <div key={key} className="flex flex-col bg-background p-5">
                      {body}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Sticky bar: tabs, plus the transcript tools while on that tab */}
          <div ref={barRef} style={{ top: stickyOffset }} className="mt-9 sticky top-0 bg-background z-10">
          <div role="tablist" aria-label="Episode content" className="flex gap-1 border-b border-border overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0 [scrollbar-width:none]">
            {tabs.filter((t) => t.show).map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => {
                  track("Episode tab", { tab: t.id, episode: `E${number}` });
                  setTab(t.id);
                }}
                className={cn(
                  "px-3 sm:px-4 min-h-11 text-[15px] -mb-px border-b-2 transition-colors whitespace-nowrap shrink-0",
                  tab === t.id ? "font-bold text-foreground border-acid" : "text-muted-foreground border-transparent hover:text-foreground"
                )}
              >
                {t.label}
                {t.count && <span className="ml-1.5 text-xs text-muted-foreground font-normal">{t.count}</span>}
              </button>
            ))}
          </div>
          {tab === "transcript" && (
            <div className="flex flex-wrap items-center gap-3 py-3">
              <label className="flex flex-1 min-w-[220px] items-center gap-2 rounded-[2px] border border-border px-3 py-2 text-sm text-muted-foreground focus-within:border-acid">
                <Search className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Search this transcript</span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search this episode’s transcript"
                  className="flex-1 bg-transparent outline-none text-foreground"
                />
              </label>
              <button
                type="button"
                onClick={() => setFollow((f) => !f)}
                aria-pressed={follow}
                className={cn(
                  "inline-flex items-center gap-2 rounded-[2px] border px-3.5 min-h-11 text-[13px] font-semibold transition-colors",
                  follow ? "border-acid bg-raised text-acid" : "border-border text-muted-foreground"
                )}
              >
                <ArrowDown className="h-4 w-4" /> Follow video
              </button>
            </div>
          )}
          </div>

          {/* Transcript: rendered in full on the server so it is readable by search and AI crawlers */}
          <div hidden={tab !== "transcript"} ref={transcriptRef}>
            <div
              ref={listRef}
              onScroll={onListScroll}
              style={{ height: boxHeight }}
              className={cn("relative pr-2 pb-6", docked ? "overflow-y-auto" : "overflow-hidden")}
            >
              {paragraphs.map((p, i) => {
                const chapter = chapterAt.get(i);
                const person = people.get(p.speaker);
                const tiny = p.text.split(" ").length < 4;
                const prev = paragraphs[i - 1];
                const showSpeaker = !tiny && (!prev || prev.speaker !== p.speaker || !!chapter || !!q);
                const match = q && p.text.toLowerCase().includes(q);
                if (q && !match && !chapter) return null;
                return (
                  <div key={i}>
                    {chapter && !q && (
                      <div className="flex flex-wrap items-baseline gap-3 pt-6 pb-2 mt-2 px-3 sm:px-4 border-t border-border">
                        <Stamp at={formatStamp(chapter.start)} onSeek={seek} className="text-[13px]" />
                        <h3 className="font-sans text-xl font-bold">{chapter.title}</h3>
                      </div>
                    )}
                    {(!q || match) && (
                      <div
                        data-p={i}
                        onClick={() => {
                          if (window.getSelection()?.toString()) return;
                          track("Episode jump", { from: "transcript", episode: `E${number}` });
                          seek(p.start, { fromTranscript: true });
                        }}
                        title={`Play from ${formatStamp(p.start)}`}
                        className={cn(
                          "flex flex-col sm:flex-row gap-1.5 sm:gap-5 rounded-[2px] px-3 sm:px-4 transition-colors cursor-pointer hover:bg-surface",
                          tiny ? "py-1" : showSpeaker ? "pt-4 pb-2" : "py-2",
                          i === activeIndex && "!bg-raised"
                        )}
                      >
                        <div className={cn("sm:w-[150px] shrink-0 flex gap-2.5 items-center sm:items-start pt-0.5", !showSpeaker && "max-sm:hidden")}>
                          {showSpeaker ? <Face person={person} size={30} /> : <span className="w-[30px] shrink-0" />}
                          <span className="leading-tight flex items-baseline gap-2 sm:block">
                            {showSpeaker && (
                              <span className="block text-[13px] font-bold" style={{ color: speakerColor(p.speaker) }}>
                                {p.speaker}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                seek(p.start, { fromTranscript: true });
                              }}
                              className="text-xs text-muted-foreground tabular-nums hover:text-acid hover:underline"
                            >
                              {formatStamp(p.start)}
                            </button>
                          </span>
                        </div>
                        <p className={cn("flex-1 min-w-0 font-sans text-foreground/90", tiny ? "text-[15px] italic text-muted-foreground" : "text-[16.5px] sm:text-[17px] leading-[1.7]")}>
                          {tiny && <span className="not-italic font-sans text-xs font-semibold mr-1.5" style={{ color: speakerColor(p.speaker) }}>{p.speaker}:</span>}
                          {p.text}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {!follow && (
              <button
                type="button"
                onClick={() => setFollow(true)}
                className="sticky bottom-4 mx-auto mt-[-56px] block rounded-[2px] px-4 min-h-11 text-sm font-semibold text-[#0a0a08] shadow-lg"
                style={{ background: GREEN }}
              >
                Jump to now · {formatStamp(now)}
              </button>
            )}
          </div>

          {/* Ask (phones) */}
          {!isDesktop && (
            <div hidden={tab !== "ask"} className="pt-3">
              <div style={{ height: boxHeight }} className="rounded-[2px] border border-border bg-surface flex flex-col overflow-hidden">
                {chat}
              </div>
            </div>
          )}

          {/* Chapters */}
          <ol hidden={tab !== "chapters"} className="border-t border-border mt-4">
            {chapters.map((c, i) => {
              const done = now >= c.end ? 100 : now > c.start ? ((now - c.start) / (c.end - c.start)) * 100 : 0;
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => {
                      track("Episode jump", { from: "chapter", part: c.title, episode: `E${number}` });
                      seek(c.start);
                    }}
                    className={cn("w-full flex items-center gap-4 px-3 py-3.5 border-b border-border text-left rounded-[2px]", i === activeChapter && "bg-raised")}
                  >
                    <span className="w-16 tabular-nums text-sm font-semibold text-acid">{formatStamp(c.start)}</span>
                    <span className="flex-1 font-sans text-[17px]">{c.title}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{Math.max(1, Math.round((c.end - c.start) / 60))} min</span>
                    <span className="w-24 h-1 rounded bg-muted overflow-hidden hidden sm:block">
                      <span className="block h-full" style={{ width: `${done}%`, background: GREEN }} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          {/* Moments */}
          <div hidden={tab !== "moments"} className="pt-5">
            <div className="grid grid-cols-1 gap-px border border-border bg-border md:grid-cols-2">
              {moments.map((m, i) => (
                <button
                  key={`${m.start}-${i}`}
                  type="button"
                  onClick={() => {
                    track("Episode jump", { from: "moment", part: m.title.slice(0, 80), episode: `E${number}` });
                    seek(m.start);
                  }}
                  className="group flex flex-col bg-background p-5 text-left transition-colors duration-150 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-acid"
                >
                  <span className="text-[17px] leading-snug text-foreground">{m.title}</span>
                  {m.quote ? (
                    <span className="mt-2.5 block border-l-2 border-border pl-3 text-[15px] italic leading-[1.6] text-muted-foreground">“{m.quote}”</span>
                  ) : (
                    m.summary && <span className="mt-2 block text-[15px] leading-[1.6] text-muted-foreground">{m.summary}</span>
                  )}
                  <span className="mt-auto flex items-center justify-between pt-5">
                    <span className="sx-label !text-[10px] text-dim">{m.speaker ?? ""}</span>
                    <span className="[&>span]:group-hover:border-acid [&>span]:group-hover:bg-acid [&>span]:group-hover:text-[#0a0a08]">
                      <PlayPill at={formatStamp(m.start)} />
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          {!isDesktop && <div className="mt-8">{nextCard}</div>}
        </main>

        {/* RAIL (desktop only; on phones the chat is the Ask tab) */}
        {isDesktop && (
        <aside
          aria-label="Ask about this episode"
          className="flex-[1_1_420px] max-w-[470px] w-full lg:sticky lg:top-5 flex flex-col gap-4"
          // The rail always fills the screen: slot + next card take their size, the chat takes the rest.
          style={{ height: "calc(100dvh - var(--header-height, 57px) - 50px)", minHeight: 560 }}
        >
          {mini && <div ref={slotRef} className="aspect-video w-full shrink-0 rounded-[2px] bg-surface" aria-hidden="true" />}
          <section className="flex-1 min-h-[300px] rounded-[2px] border border-border bg-surface flex flex-col overflow-hidden">
            {chat}
          </section>
          {!mini && <div className="shrink-0">{nextCard}</div>}
        </aside>
        )}
      </div>
      </div>
    </AIAssistantProvider>
  );
}

function formatDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

/** B in the episode chat: watches what's being typed for a domain. */
function ChatDetectStrip() {
  const { inputValue } = useAIAssistantContext();
  return <CompanyDetectStrip text={inputValue} />;
}
