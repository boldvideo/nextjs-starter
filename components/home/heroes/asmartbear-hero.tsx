"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUp, ArrowUpRight, BookOpen, Headphones } from "lucide-react";
import type { HeroProps } from "../hero-slot";
import { getPortalConfig } from "@/lib/portal-config";
import type { HomeContent } from "@/lib/asmartbear/sanity";
import { CompanyChip, CompanyForm, useCompanyProfile } from "@/components/asmartbear/company";
import {
  episodes as staticEpisodes,
  talks as staticTalks,
  chapters as staticChapters,
  blurbs as staticBlurbs,
  BOOK_URL,
  SHOW_URL,
  LONGFORM_URL,
  SKILLS_URL,
} from "./asmartbear-data";

const GREEN = "#577544";
const NAVY = "#152A45";
const GOLD = "#D6A31A";

function Gear({ className, size = 120 }: { className?: string; size?: number }) {
  const teeth = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <svg
      viewBox="-100 -100 200 200"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <g fill="none" stroke={GOLD} strokeWidth="7">
        {teeth.map((deg) => (
          <rect
            key={deg}
            x="-10"
            y="-96"
            width="20"
            height="22"
            rx="3"
            transform={`rotate(${deg})`}
          />
        ))}
        <circle r="74" />
        <circle r="52" />
      </g>
    </svg>
  );
}

interface Row {
  number: string;
  founder: string;
  company: string;
  cohost?: string;
  crux: string;
  videoId: string;
  faces: string[];
}

export default function AsmartbearHero({ settings, content }: HeroProps) {
  const c = (content ?? null) as HomeContent | null;
  // Sanity first; the bundled data file is the fallback if Sanity is unreachable.
  const episodes: Row[] = c?.episodes?.length
    ? c.episodes.map((e) => ({
        number: `E${String(e.number).padStart(2, "0")}`,
        founder: (e.hotSeat ?? []).map((p) => p.name).join(" & "),
        company: e.company ?? "",
        cohost: (e.cohosts ?? []).map((p) => p.name).join(" & ") || undefined,
        crux: e.logline?.quote ?? "",
        videoId: e.boldSlug,
        faces: [...(e.hotSeat ?? []), ...(e.cohosts ?? [])].map((p) => p.photo).filter((x): x is string => !!x),
      }))
    : staticEpisodes.map((e) => ({ ...e, faces: [] }));
  const talks = c?.talks?.length ? c.talks : staticTalks;
  const chapters = c?.chapters?.length
    ? c.chapters.map((ch) => ({ ...ch, number: String(ch.number) }))
    : staticChapters;
  const blurbs = c?.book?.blurbs?.length ? (c.book.blurbs as typeof staticBlurbs) : staticBlurbs;
  const router = useRouter();
  const config = getPortalConfig(settings);
  const [question, setQuestion] = useState("");
  const [company, setCompany] = useCompanyProfile();
  const [companyOpen, setCompanyOpen] = useState(false);

  const starters = (config.ai.conversationStarters.length > 0
    ? config.ai.conversationStarters
    : [
        "My SaaS is stuck at a plateau. How do I figure out why?",
        "How does churn put a ceiling on my growth?",
        "Should I raise my prices?",
      ]
  ).slice(0, 5);
  const name = company?.business_name;
  const chips = name
    ? [
        `Which episode is most like ${name}?`,
        `What would Jason tell ${name} to fix first?`,
        `Should ${name} raise prices?`,
        `How does ${name} pick a niche?`,
      ]
    : starters;

  const ask = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    router.push(`/ask?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="-mx-5 md:-mx-10 -mt-5 md:-mt-10 mb-14">
      {/* The twin banner from longform.asmartbear.com */}
      <div className="grid grid-cols-1 sm:grid-cols-2 text-[13px] font-bold uppercase tracking-wide font-sans">
        <a
          href={BOOK_URL}
          target="_blank"
          rel="noopener"
          className="text-center py-2 px-4 text-[#111] hover:brightness-95 transition"
          style={{ backgroundColor: "#DD7A2A" }}
        >
          I wrote a book! Click here.
        </a>
        <a
          href={SHOW_URL}
          target="_blank"
          rel="noopener"
          className="text-center py-2 px-4 text-[#111] hover:brightness-95 transition"
          style={{ backgroundColor: "#6A9BC3" }}
        >
          Smart Bear Live is now a podcast. Listen there.
        </a>
      </div>

      {/* Hero */}
      <section className="px-5 md:px-10 pt-12 md:pt-16 pb-14 border-b border-border">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <p
              className="text-xs font-bold uppercase tracking-[0.18em] mb-5"
              style={{ color: GREEN }}
            >
              Smart Bear Live
            </p>
            <h1 className="font-heading text-4xl md:text-[3.25rem] leading-[1.08] font-bold text-foreground tracking-tight">
              This is not an interview.
              <br />
              <span className="italic font-normal">There’s no script.</span>
            </h1>
            <p className="mt-6 text-lg text-foreground/80 leading-relaxed max-w-xl">
              A startup founder takes the hot seat, opens up their business,
              and explains their biggest challenge. Then we dig in: a few
              other founders who have already solved that challenge in their
              own businesses.
            </p>
            <p className="mt-3 text-lg text-foreground/80 leading-relaxed max-w-xl">
              This is the messy, uncomfortable process of solving a real puzzle
              faced by a real company. For the love of the game, for those in
              the arena.
            </p>
            <p className="mt-6 text-sm text-muted-foreground">— Jason Cohen</p>
          </div>

          <div className="lg:col-span-5 flex justify-center">
            <div className="relative">
              <div
                className="absolute inset-6 rounded-full"
                style={{ backgroundColor: "#EEF1E6" }}
              />
              <Image
                src="/asmartbear/smart-bear-live.png"
                alt="Smart Bear Live: a bear in a baseball cap at a microphone"
                width={420}
                height={420}
                priority
                className="relative w-64 md:w-[24rem] h-auto"
              />
            </div>
          </div>
        </div>

        {/* Ask: reads as a conversation, not a form */}
        <div className="max-w-6xl mx-auto mt-12">
          <div className="rounded-2xl border border-border bg-[#F6F7F2] p-5 md:p-7">
            <div className="flex items-start gap-3">
              <Image
                src={config.ai.avatar}
                alt=""
                width={44}
                height={44}
                className="rounded-full shrink-0 ring-2 ring-white"
                unoptimized
              />
              <div>
                <p className="font-heading font-bold text-lg leading-tight">
                  Stuck on something yourself?
                </p>
                <p className="text-[15px] text-foreground/75 mt-1 max-w-2xl">
                  It’s an AI that has watched every episode. It isn’t me, and
                  it shows you exactly where each answer comes from.
                </p>
              </div>
            </div>

            {companyOpen && (
              <div className="mt-5 max-w-xl">
                <CompanyForm
                  initial={company}
                  onClose={() => setCompanyOpen(false)}
                  onSave={(p) => {
                    setCompany(p);
                    setCompanyOpen(false);
                  }}
                />
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(question);
              }}
              className="mt-5 rounded-xl border border-border bg-background focus-within:border-[#577544] focus-within:ring-2 focus-within:ring-[#577544]/15 transition"
            >
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    ask(question);
                  }
                }}
                rows={2}
                placeholder={
                  name
                    ? `Ask about ${name}. “Growth went flat after…”`
                    : "Describe your situation. “We’re at $20K MRR, churn is 6%, and growth has gone flat…”"
                }
                className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-base outline-none placeholder:text-muted-foreground/70"
                aria-label={`Ask ${config.ai.name}`}
              />
              <div className="flex items-center justify-between px-3 pb-3">
                <CompanyChip profile={company} onOpen={() => setCompanyOpen(true)} onClear={() => setCompany(null)} />
                <button
                  type="submit"
                  aria-label="Send"
                  disabled={!question.trim()}
                  className="ml-auto h-9 w-9 rounded-full flex items-center justify-center text-white disabled:opacity-40 transition-opacity"
                  style={{ backgroundColor: GREEN }}
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
              {chips.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="text-left text-sm px-3 py-1.5 rounded-lg border border-border bg-background hover:border-[#577544] hover:text-[#3f5631] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* The hot seat */}
      <section className="px-5 md:px-10 py-14 border-b border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">
                The hot seat
              </h2>
              <p className="mt-2 text-muted-foreground max-w-2xl">
                Every one of these founders opened up their real numbers. Here’s
                what each one was stuck on, in my words from the top of the
                episode.
              </p>
            </div>
            <a
              href={SHOW_URL}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 text-sm font-semibold hover:underline"
              style={{ color: GREEN }}
            >
              <Headphones className="h-4 w-4" /> Listen anywhere
            </a>
          </div>

          <ol className="divide-y divide-border border-y border-border">
            {episodes.map((ep) => {
              const inner = (
                <div className="grid grid-cols-12 gap-3 md:gap-6 py-4 items-baseline group">
                  <span
                    className="col-span-2 md:col-span-1 font-heading text-xl font-bold tabular-nums"
                    style={{ color: GREEN }}
                  >
                    {ep.number}
                  </span>
                  <div className="col-span-10 md:col-span-4 flex items-center gap-3">
                    {ep.faces.length > 0 && (
                      <span className="flex shrink-0 w-[84px]">
                        {ep.faces.slice(0, 3).map((src, i) => (
                          <Image
                            key={src}
                            src={src}
                            alt=""
                            width={36}
                            height={36}
                            className={`h-9 w-9 rounded-full object-cover ring-2 ring-background ${i > 0 ? "-ml-3" : ""}`}
                          />
                        ))}
                      </span>
                    )}
                    <div>
                    <div className="font-semibold text-foreground group-hover:underline decoration-2 underline-offset-4 decoration-[#577544]">
                      {ep.company}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {ep.founder}
                      {ep.cohost && (
                        <>
                          {" "}
                          <span className="opacity-60">· with</span> {ep.cohost}
                        </>
                      )}
                    </div>
                    </div>
                  </div>
                  <p className="col-span-12 md:col-span-7 md:pl-0 pl-[16.6%] font-heading italic text-[1.05rem] text-foreground/85 leading-snug">
                    “{ep.crux}”
                  </p>
                </div>
              );
              return (
                <li key={ep.number}>
                  {ep.videoId ? (
                    <Link href={`/v/${ep.videoId}`} prefetch={false}>
                      {inner}
                    </Link>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Talks: link out to YouTube */}
      <section className="px-5 md:px-10 py-10 border-b border-border">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-heading text-2xl font-bold tracking-tight">Talks</h2>
          <p className="mt-1 text-sm text-muted-foreground">Solo talks and keynotes, on YouTube.</p>
          <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {talks.map((t) => (
              <li key={t.youtubeId}>
                <a
                  href={`https://www.youtube.com/watch?v=${t.youtubeId}`}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 hover:border-[#577544] transition-colors"
                >
                  <span>
                    <span className="block font-semibold text-foreground">{t.title}</span>
                    <span className="text-sm text-muted-foreground">{t.note}</span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* The book */}
      <section
        className="relative overflow-hidden px-5 md:px-10 py-16 md:py-20 text-white"
        style={{ backgroundColor: NAVY }}
      >
        <Gear className="absolute -top-10 -left-10 opacity-25" size={220} />
        <Gear className="absolute bottom-[-60px] right-[-40px] opacity-20" size={300} />
        <Gear className="absolute top-1/3 right-1/3 opacity-10 hidden lg:block" size={140} />

        <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-4 flex justify-center">
            <a href={BOOK_URL} target="_blank" rel="noopener" className="block">
              <Image
                src="/asmartbear/hidden-multipliers-3d.png"
                alt="Hidden Multipliers by Jason Cohen, book cover"
                width={600}
                height={913}
                className="w-56 md:w-72 h-auto drop-shadow-[0_30px_40px_rgba(0,0,0,0.45)] hover:-rotate-1 hover:scale-[1.02] transition-transform"
              />
            </a>
          </div>

          <div className="lg:col-span-8">
            <p
              className="text-xs font-bold uppercase tracking-[0.18em] mb-3"
              style={{ color: GOLD }}
            >
              I wrote a book!
            </p>
            <h2 className="font-heading text-4xl md:text-5xl font-bold tracking-tight">
              Hidden Multipliers
            </h2>
            <p className="font-heading italic text-xl md:text-2xl mt-2 text-white/85">
              My best ideas for how to grow.
            </p>
            <p className="mt-5 text-white/80 leading-relaxed max-w-2xl">
              I founded two unicorns and invested in dozens of companies over
              25 years. These are my best ideas: mechanisms that create
              outsized profit and growth, with your current budget and team.
            </p>
            <p className="mt-3 text-white/80 leading-relaxed max-w-2xl">
              Blogs and podcasts are mostly generic platitudes or tactics you
              can’t replicate. This book isn’t like that. It’s written for
              adults. You’re not in the 5th grade.
            </p>

            <ol className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              {chapters.map((c) => (
                <li key={c.number} className="flex gap-3">
                  <span
                    className="font-heading font-bold tabular-nums w-6 shrink-0 text-right"
                    style={{ color: GOLD }}
                  >
                    {c.number}
                  </span>
                  <span>
                    <span className="font-semibold">{c.title}</span>
                    <span className="block text-sm text-white/65 leading-snug">
                      {c.promise}
                    </span>
                  </span>
                </li>
              ))}
            </ol>

            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href={BOOK_URL}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-md font-semibold text-[#152A45] hover:brightness-105 transition"
                style={{ backgroundColor: GOLD }}
              >
                <BookOpen className="h-4 w-4" /> Get the book
              </a>
              <a
                href={SKILLS_URL}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-md font-semibold border border-white/40 hover:bg-white/10 transition"
              >
                AI skills for the book <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="relative max-w-6xl mx-auto mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          {blurbs.map((b) => (
            <figure
              key={b.name}
              className="rounded-md border border-white/15 bg-white/[0.04] p-5"
            >
              <blockquote className="font-heading italic leading-relaxed text-white/90">
                “{b.quote}”
              </blockquote>
              <figcaption className="mt-3 text-sm">
                <span className="font-semibold">{b.name}</span>
                <span className="text-white/60"> · {b.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Longform */}
      <section className="px-5 md:px-10 py-8 border-b border-border">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/asmartbear/bear.svg" alt="" width={44} height={38} />
            <p className="text-foreground">
              <span className="font-heading font-bold">A Smart Bear: Longform.</span>{" "}
              <span className="text-muted-foreground">
                Articles from building two unicorns over two decades; one
                bootstrapped, one funded.
              </span>
            </p>
          </div>
          <a
            href={LONGFORM_URL}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
            style={{ color: GREEN }}
          >
            Read the articles <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </section>
    </div>
  );
}
