"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { format } from "date-fns";
import { ArrowDown, ArrowUp, ArrowUpRight, ChevronRight, Headphones, Play, Search, Share2, X } from "lucide-react";
import type { Settings } from "@boldvideo/bold-js";
import { Player } from "@/components/players";
import { AIAssistant } from "@/components/video/chat";
import { AIAssistantProvider } from "@/components/video/chat/context";
import { Breadcrumb } from "@/components/providers/breadcrumb-provider";
import { getPortalConfig } from "@/lib/portal-config";
import { cn } from "@/lib/utils";
import type { ExtendedVideo } from "@/types/video-detail";
import type { EpisodeContent, Person } from "@/lib/asmartbear/sanity";
import type { Chapter, Paragraph } from "@/lib/asmartbear/episode-data";
import { formatStamp, stampToSeconds } from "@/lib/asmartbear/time";
import { viewerProfile } from "@/lib/asmartbear/profile";
import { CompanyDetectStrip, CompanySeat, CompanyUrlBox, ComposerCompanyPill, useCompanyProfile } from "./company";
import { useAIAssistantContext } from "@/components/video/chat/context";

const GREEN = "#577544";
const NAVY = "#152A45";
const SPEAKER_COLORS = ["#3f5631", NAVY, "#8a5a00", "#7a2e4a", "#1f5f6b"];

type Tab = "transcript" | "ask" | "chapters" | "moments" | "tools";

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
  startTime?: number;
}

function Face({ person, size = 40 }: { person?: Person; size?: number }) {
  if (!person) return null;
  return person.photo ? (
    <Image
      src={person.photo}
      alt=""
      width={size}
      height={size}
      className="rounded-full object-cover shrink-0"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className="rounded-full shrink-0 flex items-center justify-center text-white font-bold"
      style={{ width: size, height: size, background: NAVY, fontSize: size * 0.34 }}
    >
      {person.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
    </span>
  );
}

/** A timestamp always looks like what it does: a small "play from here" pill. */
function PlayPill({ at, filled = false }: { at: string; filled?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full pl-1.5 pr-2 py-[3px] text-[12px] font-semibold tabular-nums leading-none transition-colors duration-150",
        filled ? "bg-[#577544] text-white" : "bg-[#eef1e6] text-[#2c3d22]"
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
        "group/stamp align-middle rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#577544] focus-visible:ring-offset-2 [&>span]:hover:bg-[#577544] [&>span]:hover:text-white active:scale-[0.97] transition-transform",
        className
      )}
    >
      <PlayPill at={at} />
    </button>
  );
}

export function EpisodePage({ video, settings, episode, paragraphs, chapters, startTime }: EpisodePageProps) {
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
    const list = [
      ...(episode?.host ? [episode.host] : []),
      ...(episode?.hotSeat ?? []),
      ...(episode?.cohosts ?? []),
    ];
    return new Map(list.map((p) => [p.name.replace(/^Dr\.\s+/, ""), p] as const).concat(list.map((p) => [p.name, p] as const)));
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
    const top = el.offsetTop - box.offsetTop - box.clientHeight / 3;
    programmaticUntil.current = Date.now() + 900;
    box.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
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
  const published = video.publishedAt ? format(new Date(video.publishedAt), "MMM d, yyyy") : null;
  const duration = video.duration ? formatDuration(video.duration) : null;
  const tabs: { id: Tab; label: string; count?: string; show: boolean }[] = [
    { id: "transcript", label: "Transcript", count: duration ?? undefined, show: paragraphs.length > 0 },
    { id: "ask", label: "Ask", show: !isDesktop },
    { id: "chapters", label: "Chapters", count: String(chapters.length), show: chapters.length > 0 },
    { id: "moments", label: "Moments", count: String(episode?.moments?.length ?? 0), show: (episode?.moments?.length ?? 0) > 0 },
    { id: "tools", label: "Toolbox", count: String(episode?.tools?.length ?? 0), show: (episode?.tools?.length ?? 0) > 0 },
  ];

  const crux = episode?.crux;
  const cruxCells: { key: keyof NonNullable<typeof crux>; label: string }[] = [
    { key: "situation", label: "The situation" },
    { key: "diagnosis", label: "The diagnosis" },
    { key: "options", label: "On the table" },
    { key: "landed", label: "Where it landed" },
  ];

  const chat = (
    <AIAssistant
              videoId={video.id}
              name={ai.name}
              avatar={ai.avatar}
              subdomain=""
              greeting={company?.business_name ? `${company.business_name} is on the hot seat. What’s the biggest challenge right now?` : ai.greeting}
              isEmbedded
              variant="panel"
              tagline="AI assistant · not Jason"
              placeholder={company?.business_name ? `Ask about ${company.business_name} and this episode…` : "Ask about this episode, or your own business…"}
              viewerProfile={viewerProfile(company)}
              starters={
                company?.business_name
                  ? [`How does this episode apply to ${company.business_name}?`, "What would Jason look at first in my numbers?"]
                  : [
                      episode?.company ? `What did ${episode.company} decide to do?` : "What did they decide to do?",
                      "What would Jason tell me if I had this problem?",
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
  const nextCard = episode?.next && (
            <Link
              href={`/v/${episode.next.boldSlug}`}
              className="flex items-center gap-3.5 rounded-2xl border border-border px-4 py-4 hover:border-[#577544] transition-colors"
            >
              <span className="flex shrink-0">
                {[...(episode.next.hotSeat ?? []), ...(episode.next.cohosts ?? [])].slice(0, 3).map((p, i) => (
                  <span key={p.slug} className={cn("rounded-full ring-2 ring-background", i > 0 && "-ml-3")}>
                    <Face person={p} size={40} />
                  </span>
                ))}
              </span>
              <span className="flex-1 leading-snug">
                <span className="block text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: GREEN }}>
                  Next · E{String(episode.next.number).padStart(2, "0")}
                </span>
                <span className="block text-sm font-semibold mt-0.5">
                  {(episode.next.hotSeat ?? []).map((p) => p.name).join(" & ")}, {episode.next.company}
                  {episode.next.cohosts?.length ? (
                    <span className="font-normal text-muted-foreground">
                      {" "}· with {episode.next.cohosts.map((p) => `${p.name}${p.company ? `, ${p.company.split(",")[0]}` : ""}`).join(" & ")}
                    </span>
                  ) : null}
                </span>
                {episode.next.logline?.quote && (
                  <span className="block font-heading italic text-[15px] text-muted-foreground mt-1 line-clamp-2">“{episode.next.logline.quote}”</span>
                )}
              </span>
              <ChevronRight className="h-5 w-5 shrink-0" />
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
      <Breadcrumb label={episode ? `E${number} · ${episode.company}` : video.title} />
      {/* The portal layout locks the page (main is overflow-hidden), so the episode page owns its scroll area. */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-[1360px] mx-auto px-5 md:px-7 pt-5 pb-20 flex flex-wrap gap-9 items-start">
        {/* MAIN */}
        <main className="flex-[999_1_640px] min-w-0">
          <div ref={placeholderRef} className="relative aspect-video bg-[#f2f2ee] -mx-5 md:mx-0 rounded-none md:rounded-2xl">
            <div
              style={mini ? miniStyle : undefined}
              className={cn(
                "bg-black overflow-hidden",
                mini
                  ? cn("z-40 shadow-[0_18px_40px_rgba(0,0,0,0.28)]", isDesktop ? "rounded-xl" : "rounded-none")
                  : "absolute inset-0 rounded-none md:rounded-2xl"
              )}
            >
              <Player video={video} autoPlay={false} ref={playerRef} startTime={startTime} className="w-full h-full" />
              {mini && (
                <div className="absolute top-2 right-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
                    aria-label="Back to the video"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={closeMini}
                    aria-label="Close mini player"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <header className="mt-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: GREEN }}>
              {number ? `Episode ${number}` : "Smart Bear Live"}
              {published && ` · ${published}`}
              {duration && ` · ${duration}`}
            </p>
            <h1 className="font-heading mt-2.5 text-3xl md:text-[2.75rem] leading-[1.08] font-bold tracking-tight">
              {episode?.title ?? video.title}
            </h1>
            {episode?.logline?.quote && (
              <figure className="mt-4 max-w-3xl">
                <blockquote className="font-heading italic text-lg md:text-xl leading-relaxed text-foreground/85">
                  “{episode.logline.quote}”
                </blockquote>
                <figcaption className="mt-2.5 flex items-center gap-2 text-[13px] text-muted-foreground">
                  <Face person={episode.host} size={22} />
                  {episode.logline.at ? (
                    <>
                      Jason, opening the episode · <Stamp at={episode.logline.at} onSeek={seek} />
                    </>
                  ) : (
                    <>Jason, in the episode description</>
                  )}
                </figcaption>
              </figure>
            )}
          </header>

          {/* Cast */}
          {episode && (
            <div className="mt-6 flex items-center gap-3 max-sm:-mx-5 max-sm:px-5 max-sm:overflow-x-auto max-sm:pb-1 [scrollbar-width:none] sm:flex-wrap [&>*]:shrink-0">
              {[
                ...(episode.hotSeat ?? []).map((p) => ({ p, role: "On the hot seat" })),
                ...(episode.cohosts ?? []).map((p) => ({ p, role: "Cohost" })),
                ...(episode.host ? [{ p: episode.host, role: "Host" }] : []),
              ].map(({ p, role }) => (
                <a
                  key={p.slug + role}
                  href={p.companyUrl || (p.x ? `https://x.com/${p.x}` : undefined)}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center gap-2.5 rounded-xl border border-border py-2 pl-2 pr-4 hover:border-[#577544] transition-colors"
                >
                  <Face person={p} />
                  <span className="text-[13px] leading-tight">
                    <span className="block font-semibold text-foreground">{p.name}</span>
                    <span className="text-muted-foreground">
                      {role}
                      {p.company ? ` · ${p.company}` : ""}
                    </span>
                  </span>
                </a>
              ))}
              <CompanySeat />
              <span className="flex-1" />
              <a
                href="https://smartbearlive.com"
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 min-h-11 text-[13px] font-semibold hover:border-[#577544]"
              >
                <Headphones className="h-4 w-4" /> Listen
              </a>
              <button
                type="button"
                onClick={() => navigator.share?.({ title: episode.title, url: window.location.href }).catch(() => {})}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 min-h-11 text-[13px] font-semibold hover:border-[#577544]"
              >
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
          )}

          {/* The crux */}
          {crux && (
            <section aria-labelledby="crux" className="mt-10">
              <h2 id="crux" className="font-heading text-[22px] font-bold mb-3">The crux</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl border border-border bg-border overflow-hidden">
                {cruxCells.map(({ key, label }) => {
                  const cell = crux[key];
                  if (!cell?.text) return null;
                  const s = stampToSeconds(cell.at);
                  const body = (
                    <>
                      <span className="block text-[11px] font-bold uppercase tracking-[0.12em] mb-2" style={{ color: GREEN }}>{label}</span>
                      <span className="block text-[14.5px] leading-relaxed text-foreground">{cell.text}</span>
                      {cell.at && s !== null && (
                        <span className="mt-auto pt-4 block [&>span]:group-hover:bg-[#577544] [&>span]:group-hover:text-white">
                          <PlayPill at={cell.at} />
                        </span>
                      )}
                    </>
                  );
                  return s !== null ? (
                    <button
                      key={key}
                      type="button"
                      onClick={() => seek(s)}
                      aria-label={`${label}: play from ${cell.at}`}
                      className="group flex flex-col text-left p-5 bg-background hover:bg-[#f6f7f2] active:bg-[#eef1e6] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#577544]"
                    >
                      {body}
                    </button>
                  ) : (
                    <div key={key} className="flex flex-col p-5 bg-background">{body}</div>
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
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-3 sm:px-4 min-h-11 text-[15px] -mb-px border-b-2 transition-colors whitespace-nowrap shrink-0",
                  tab === t.id ? "font-bold text-foreground border-[#577544]" : "text-muted-foreground border-transparent hover:text-foreground"
                )}
              >
                {t.label}
                {t.count && <span className="ml-1.5 text-xs text-muted-foreground font-normal">{t.count}</span>}
              </button>
            ))}
          </div>
          {tab === "transcript" && (
            <div className="flex flex-wrap items-center gap-3 py-3">
              <label className="flex flex-1 min-w-[220px] items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground focus-within:border-[#577544]">
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
                  "inline-flex items-center gap-2 rounded-xl border px-3.5 min-h-11 text-[13px] font-semibold transition-colors",
                  follow ? "border-[#577544] bg-[#eef1e6] text-[#2c3d22]" : "border-border text-muted-foreground"
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
                      <div className="flex flex-wrap items-baseline gap-3 pt-6 pb-2 mt-2 border-t border-border">
                        <Stamp at={formatStamp(chapter.start)} onSeek={seek} className="text-[13px]" />
                        <h3 className="font-heading text-xl font-bold">{chapter.title}</h3>
                      </div>
                    )}
                    {(!q || match) && (
                      <div
                        data-p={i}
                        onClick={() => {
                          if (window.getSelection()?.toString()) return;
                          seek(p.start, { fromTranscript: true });
                        }}
                        title={`Play from ${formatStamp(p.start)}`}
                        className={cn(
                          "flex flex-col sm:flex-row gap-1.5 sm:gap-5 rounded-xl px-4 -mx-4 transition-colors cursor-pointer hover:bg-[#f4f6ef]",
                          tiny ? "py-1" : showSpeaker ? "pt-4 pb-2" : "py-2",
                          i === activeIndex && "!bg-[#eef1e6]"
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
                              className="text-xs text-muted-foreground tabular-nums hover:text-[#3f5631] hover:underline"
                            >
                              {formatStamp(p.start)}
                            </button>
                          </span>
                        </div>
                        <p className={cn("flex-1 min-w-0 font-heading text-foreground/90", tiny ? "text-[15px] italic text-muted-foreground" : "text-[16.5px] sm:text-[17px] leading-[1.7]")}>
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
                className="sticky bottom-4 mx-auto mt-[-56px] block rounded-full px-4 min-h-11 text-sm font-semibold text-white shadow-lg"
                style={{ background: GREEN }}
              >
                Jump to now · {formatStamp(now)}
              </button>
            )}
          </div>

          {/* Ask (phones) */}
          {!isDesktop && (
            <div hidden={tab !== "ask"} className="pt-3">
              <div style={{ height: boxHeight }} className="rounded-[20px] border border-border bg-[#fbfbf8] flex flex-col overflow-hidden">
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
                    onClick={() => seek(c.start)}
                    className={cn("w-full flex items-center gap-4 px-3 py-3.5 border-b border-border text-left rounded-lg", i === activeChapter && "bg-[#eef1e6]")}
                  >
                    <span className="w-16 tabular-nums text-sm font-semibold text-[#3f5631]">{formatStamp(c.start)}</span>
                    <span className="flex-1 font-heading text-[17px]">{c.title}</span>
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
          <div hidden={tab !== "moments"} className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {episode?.moments?.map((m) => (
                <button
                  key={m.slug ?? m.quote}
                  type="button"
                  onClick={() => {
                    const s = stampToSeconds(m.at);
                    if (s !== null) seek(s);
                  }}
                  className="group text-left rounded-2xl border border-border p-5 hover:border-[#577544] hover:bg-[#fbfcf8] active:scale-[0.99] transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#577544]"
                >
                  <span className="block font-heading text-[19px] leading-snug">“{m.quote}”</span>
                  <span className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-2 font-semibold text-foreground">
                      <Face person={m.speaker} size={22} /> {m.speaker?.name}
                    </span>
                    {m.at && <span className="[&>span]:group-hover:bg-[#577544] [&>span]:group-hover:text-white"><PlayPill at={m.at} /></span>}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Toolbox */}
          <div hidden={tab !== "tools"} className="pt-4 flex flex-col gap-2.5">
            {episode?.tools?.map((t) => (
              <div key={t.name} className="flex flex-wrap items-center gap-4 rounded-2xl border border-border px-5 py-4">
                <span className="flex-1 min-w-[220px]">
                  <span className="block font-heading font-bold text-lg">{t.name}</span>
                  <span className="text-[13px] text-muted-foreground">{t.summary}</span>
                </span>
                {t.chapter && <span className="text-xs text-muted-foreground">Hidden Multipliers, ch. {t.chapter.number}</span>}
                {t.articleUrl && (
                  <a href={t.articleUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#3f5631] hover:underline">
                    Read the article <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
          {!isDesktop && <div className="mt-8">{nextCard}</div>}
        </main>

        {/* RAIL (desktop only; on phones the chat is the Ask tab) */}
        {isDesktop && (
        <aside aria-label="Ask about this episode" className="flex-[1_1_420px] max-w-[470px] w-full lg:sticky lg:top-5 flex flex-col gap-4">
          {mini && <div ref={slotRef} className="aspect-video w-full rounded-xl bg-[#f2f2ee]" aria-hidden="true" />}
          <section
            className="rounded-[20px] border border-border bg-[#fbfbf8] flex flex-col min-h-[340px] overflow-hidden"
            style={{
              height: mini
                ? "calc(100dvh - var(--header-height, 57px) - 40px - (min(470px, 100%) * 9 / 16) - 16px)"
                : "min(820px, calc(100dvh - var(--header-height, 57px) - 235px))",
            }}
          >
            {chat}
          </section>
          {!mini && nextCard}
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
