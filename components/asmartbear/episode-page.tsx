"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { ArrowDown, ArrowUpRight, ChevronRight, Headphones, Search, Share2 } from "lucide-react";
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

const GREEN = "#577544";
const NAVY = "#152A45";
const SPEAKER_COLORS = ["#3f5631", NAVY, "#8a5a00", "#7a2e4a", "#1f5f6b"];

type Tab = "transcript" | "chapters" | "moments" | "tools";

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

function Stamp({ at, onSeek, className }: { at?: string | null; onSeek: (s: number) => void; className?: string }) {
  const s = stampToSeconds(at);
  if (s === null) return null;
  return (
    <button
      type="button"
      onClick={() => onSeek(s)}
      className={cn("font-semibold tabular-nums text-[#3f5631] hover:underline", className)}
    >
      {at}
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

  const seek = useCallback((t: number) => {
    const p = playerRef.current;
    if (!p) return;
    p.currentTime = t;
    void p.play?.();
    setFollow(true);
  }, []);

  // Track playback for the active paragraph and chapter.
  useEffect(() => {
    let raf = 0;
    const id = window.setInterval(() => {
      const t = playerRef.current?.currentTime ?? 0;
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

  // Keep the active paragraph in view while following; scrolling by hand pauses it.
  useEffect(() => {
    if (!follow || tab !== "transcript" || activeIndex < 0 || now < 1) return;
    const el = transcriptRef.current?.querySelector<HTMLElement>(`[data-p="${activeIndex}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeIndex, follow, tab, now]);

  useEffect(() => {
    const stop = () => setFollow(false);
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchmove", stop, { passive: true });
    return () => {
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchmove", stop);
    };
  }, []);

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

  return (
    <AIAssistantProvider key={video.id} onTimeClick={(t) => seek(t)}>
      <Breadcrumb label={episode ? `E${number} · ${episode.company}` : video.title} />
      <div className="max-w-[1360px] mx-auto px-5 md:px-7 pt-5 pb-20 flex flex-wrap gap-9 items-start">
        {/* MAIN */}
        <main className="flex-[999_1_640px] min-w-0">
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
            <Player video={video} autoPlay={false} ref={playerRef} startTime={startTime} className="w-full h-full" />
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
            <div className="mt-6 flex flex-wrap items-center gap-3">
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
            <section aria-labelledby="crux" className="mt-8 rounded-2xl border border-border overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 bg-[#f6f7f2] border-b border-border">
                <h2 id="crux" className="font-heading text-xl font-bold">The crux, in four minutes of reading</h2>
                <span className="text-xs text-muted-foreground">Every line links to the moment it was said</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {cruxCells.map(({ key, label }, i) =>
                  crux[key]?.text ? (
                    <div key={key} className={cn("p-5 border-border", i < 3 && "lg:border-r", i % 2 === 0 && "sm:border-r lg:border-r", i < 2 && "sm:border-b lg:border-b-0", "border-b sm:border-b-0 last:border-b-0")}>
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-2" style={{ color: GREEN }}>{label}</p>
                      <p className="text-sm leading-relaxed">
                        {crux[key].text} <Stamp at={crux[key].at} onSeek={seek} className="text-xs" />
                      </p>
                    </div>
                  ) : null
                )}
              </div>
            </section>
          )}

          {/* Tabs */}
          <div role="tablist" aria-label="Episode content" className="mt-9 flex flex-wrap gap-1 border-b border-border sticky top-[var(--header-height,64px)] bg-background z-10">
            {tabs.filter((t) => t.show).map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-4 min-h-11 text-[15px] -mb-px border-b-2 transition-colors",
                  tab === t.id ? "font-bold text-foreground border-[#577544]" : "text-muted-foreground border-transparent hover:text-foreground"
                )}
              >
                {t.label}
                {t.count && <span className="ml-1.5 text-xs text-muted-foreground font-normal">{t.count}</span>}
              </button>
            ))}
          </div>

          {/* Transcript: rendered in full on the server so it is readable by search and AI crawlers */}
          <div hidden={tab !== "transcript"} ref={transcriptRef}>
            <div className="flex flex-wrap items-center gap-3 py-4">
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

            <div className="pb-6">
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
                        className={cn(
                          "flex gap-5 rounded-xl px-4 -mx-4 transition-colors",
                          tiny ? "py-1" : showSpeaker ? "pt-4 pb-2" : "py-2",
                          i === activeIndex && "bg-[#eef1e6]"
                        )}
                      >
                        <div className="w-[150px] shrink-0 flex gap-2.5 items-start pt-0.5">
                          {showSpeaker ? <Face person={person} size={30} /> : <span className="w-[30px] shrink-0" />}
                          <span className="leading-tight">
                            {showSpeaker && (
                              <span className="block text-[13px] font-bold" style={{ color: speakerColor(p.speaker) }}>
                                {p.speaker}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => seek(p.start)}
                              className="text-xs text-muted-foreground tabular-nums hover:text-[#3f5631] hover:underline"
                            >
                              {formatStamp(p.start)}
                            </button>
                          </span>
                        </div>
                        <p className={cn("flex-1 min-w-0 font-heading text-foreground/90", tiny ? "text-[15px] italic text-muted-foreground" : "text-[17px] leading-[1.7]")}>
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
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 rounded-full px-4 min-h-11 text-sm font-semibold text-white shadow-lg"
                style={{ background: GREEN }}
              >
                Jump to now · {formatStamp(now)}
              </button>
            )}
          </div>

          {/* Chapters */}
          <ol hidden={tab !== "chapters"} className="border-t border-border mt-4">
            <p className="text-[13px] text-muted-foreground py-3">Chapters by Jason, from the episode description.</p>
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
            <p className="text-[13px] text-muted-foreground mb-3">The lines worth stealing. Click to hear it.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {episode?.moments?.map((m) => (
                <button
                  key={m.slug ?? m.quote}
                  type="button"
                  onClick={() => {
                    const s = stampToSeconds(m.at);
                    if (s !== null) seek(s);
                  }}
                  className="text-left rounded-2xl border border-border p-5 hover:border-[#577544] transition-colors"
                >
                  <span className="block font-heading text-[19px] leading-snug">“{m.quote}”</span>
                  <span className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-2 font-semibold text-foreground">
                      <Face person={m.speaker} size={22} /> {m.speaker?.name}
                    </span>
                    <span className="tabular-nums">{m.at}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Toolbox */}
          <div hidden={tab !== "tools"} className="pt-4 flex flex-col gap-2.5">
            <p className="text-[13px] text-muted-foreground">The frameworks Jason reached for in this episode.</p>
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
        </main>

        {/* RAIL */}
        <aside aria-label="Ask about this episode" className="flex-[1_1_420px] max-w-[470px] w-full lg:sticky lg:top-[calc(var(--header-height,64px)+16px)] flex flex-col gap-4">
          <section className="asb-chat rounded-[20px] border border-border bg-[#fbfbf8] flex flex-col h-[min(780px,calc(100vh-var(--header-height,64px)-140px))] min-h-[520px] overflow-hidden">
            <div className="flex-1 min-h-0">
              <AIAssistant
                videoId={video.id}
                name={ai.name}
                avatar={ai.avatar}
                subdomain=""
                greeting={ai.greeting}
                isEmbedded
                className="h-full"
              />
            </div>
            <p className="px-6 py-2.5 text-[12px] text-muted-foreground border-t border-border/70">
              Knows every episode. Not Jason. Cites the moment.
            </p>
          </section>

          {episode?.next && (
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
          )}
        </aside>
      </div>
    </AIAssistantProvider>
  );
}

function formatDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}
