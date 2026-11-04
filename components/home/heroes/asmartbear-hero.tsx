"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, Headphones } from "lucide-react";
import type { HeroProps } from "../hero-slot";
import { getPortalConfig } from "@/lib/portal-config";
import {
  episodes,
  chapters,
  blurbs,
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

export default function AsmartbearHero({ settings }: HeroProps) {
  const router = useRouter();
  const config = getPortalConfig(settings);
  const [question, setQuestion] = useState("");

  const starters = (config.ai.conversationStarters.length > 0
    ? config.ai.conversationStarters
    : [
        "My SaaS is stuck at a plateau. How do I figure out why?",
        "How does churn put a ceiling on my growth?",
        "Should I raise my prices?",
      ]
  ).slice(0, 4);

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
      <section className="px-5 md:px-10 pt-12 md:pt-16 pb-12 border-b border-border">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <p
              className="text-xs font-bold uppercase tracking-[0.18em] mb-4"
              style={{ color: GREEN }}
            >
              Smart Bear Live · 12 episodes · 22 hours on the hot seat
            </p>
            <h1 className="font-heading text-4xl md:text-[3.4rem] leading-[1.08] font-bold text-foreground tracking-tight">
              Twelve founders opened their books.
              <br />
              <span className="italic font-normal">Ask what we found.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-xl">
              A founder takes the hot seat, opens up their business, and brings
              their biggest problem. Jason Cohen and a cohost who has already
              solved it dig in. No script, no interview. Every answer below
              comes with the moment it was said.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(question);
              }}
              className="mt-8 flex items-stretch rounded-md border-2 bg-background shadow-[4px_4px_0_0_rgba(17,17,17,0.9)] focus-within:shadow-[4px_4px_0_0_#577544] transition-shadow max-w-xl"
              style={{ borderColor: "#111" }}
            >
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about pricing, churn, niches, selling…"
                className="flex-1 bg-transparent px-4 py-3.5 text-base outline-none placeholder:text-muted-foreground/70"
                aria-label={`Ask ${config.ai.name}`}
              />
              <button
                type="submit"
                className="px-5 font-semibold text-white flex items-center gap-2 rounded-r-[3px]"
                style={{ backgroundColor: GREEN }}
              >
                Ask <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-4 flex flex-wrap gap-2 max-w-2xl">
              {starters.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="text-left text-sm px-3 py-1.5 rounded-full border border-[#577544]/30 bg-[#A2EA76]/25 hover:bg-[#A2EA76]/60 text-foreground transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {config.ai.name} is an AI trained on the show and Jason’s talks.
              It isn’t Jason, and it cites its sources so you can check.
            </p>
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
                className="relative w-72 md:w-[26rem] h-auto"
              />
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
                Who’s been on the hot seat
              </h2>
              <p className="mt-2 text-muted-foreground max-w-2xl">
                Real companies, real numbers, and the cohosts who’d already
                solved the problem.
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
                  <div className="col-span-10 md:col-span-4">
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
              The book behind the show
            </p>
            <h2 className="font-heading text-4xl md:text-5xl font-bold tracking-tight">
              Hidden Multipliers
            </h2>
            <p className="font-heading italic text-xl md:text-2xl mt-2 text-white/85">
              Jumpstart growth with your existing budget and team.
            </p>
            <p className="mt-5 text-white/80 leading-relaxed max-w-2xl">
              Ten patterns Jason has used and seen, not once but repeatedly,
              across two unicorns (Smart Bear and WP Engine) and sixty
              investments. Many of the answers on this site trace back to a
              chapter. Written for adults.
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
                Twenty years of articles from building two unicorns.
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
