"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUp, Play } from "lucide-react";
import type { HeroProps } from "../hero-slot";
import { getPortalConfig } from "@/lib/portal-config";
import { CompanyDetectStrip, CompanyUrlBox, ComposerCompanyPill, useCompanyProfile } from "@/components/shiftai/company";
import { Face } from "@/components/shiftai/face";
import { CopilotMark } from "@/components/shiftai/copilot-mark";
import { EPISODES } from "@/lib/shiftai/show";
import type { EpisodeLink } from "@/lib/shiftai/match";
import { cn } from "@/lib/utils";

interface ShiftHomeContent {
  links: Record<string, EpisodeLink>;
}

const totalSeconds = EPISODES.reduce((n, e) => n + e.duration, 0);
const totalChapters = EPISODES.reduce((n, e) => n + e.chapters.length, 0);
const hours = Math.floor(totalSeconds / 3600);
const minutes = Math.round((totalSeconds % 3600) / 60);

const dateLabel = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function ShiftaiHero({ settings, content }: HeroProps) {
  const links = ((content ?? null) as ShiftHomeContent | null)?.links ?? {};
  const router = useRouter();
  const config = getPortalConfig(settings);
  const [question, setQuestion] = useState("");
  const [company] = useCompanyProfile();
  const [urlMode, setUrlMode] = useState(false);

  const name = company?.business_name;
  const starters = (config.ai.conversationStarters.length > 0
    ? config.ai.conversationStarters
    : ["Rebuild from scratch, or bolt AI on?", "Is per-seat pricing dead?", "Should I vibe-code my own CRM?"]
  ).slice(0, 6);
  const chips = name
    ? [
        `Which founder was where ${name} is now?`,
        `What should ${name} do about pricing?`,
        `Rebuild or bolt on: what fits ${name}?`,
        `What would the guests tell ${name} to do this week?`,
      ]
    : starters;

  const ask = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    router.push(`/ask?q=${encodeURIComponent(trimmed)}`);
  };

  const stats = [
    { n: String(EPISODES.length), label: "Founders and operators" },
    { n: `${hours}h ${String(minutes).padStart(2, "0")}`, label: "Of conversation, transcribed" },
    { n: String(totalChapters), label: "Chapters you can jump to" },
    { n: "0", label: "Pitches. No slides." },
  ];

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="sx-grid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="sx-glow pointer-events-none absolute -right-40 -top-56 h-[760px] w-[760px]" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-[1360px] gap-12 px-5 pb-16 pt-14 md:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16 lg:pb-24 lg:pt-20">
          <div>
            <p className="sx-label sx-eyebrow">The AI Revolution Show · Member library</p>
            <h1 className="sx-display mt-7 text-[clamp(52px,7.2vw,112px)]">
              Which founder already faced <span className="text-acid">your decision?</span>
            </h1>
            <p className="mt-8 max-w-[34rem] text-[19px] leading-[1.65] text-muted-foreground md:text-xl">
              {EPISODES.length} conversations with the people rebuilding software for AI. Ask a question and get what
              they did, the numbers they gave, and the moment they said it.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#episodes" className="sx-btn">
                Browse the episodes <span aria-hidden="true">→</span>
              </a>
              <Link href="/connect" className="sx-btn sx-btn-ghost">
                Use it in Claude or ChatGPT
              </Link>
            </div>
          </div>

          {/* Ask */}
          <div className="self-end">
            <div className="border border-border bg-surface/95 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur md:p-6">
              <div className="flex items-center gap-3">
                <CopilotMark size={36} />
                <div className="leading-tight">
                  <p className="text-[15px] font-medium text-foreground">{config.ai.name || "Shift Copilot"}</p>
                  <p className="sx-label !text-[10px] text-dim">AI · not Alex · not a guest</p>
                </div>
              </div>

              {urlMode ? (
                <CompanyUrlBox className="mt-5 min-h-[124px]" onCancel={() => setUrlMode(false)} onDone={() => setUrlMode(false)} />
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    ask(question);
                  }}
                  className="mt-5 min-h-[124px] border border-border bg-background transition-colors focus-within:border-acid"
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
                    placeholder={name ? `Ask about ${name}. “We’re moving off per-seat and…”` : "Which decision are you working on? Or paste your website…"}
                    className="block w-full resize-none bg-transparent px-4 pb-1 pt-4 text-[17px] font-light text-foreground outline-none placeholder:text-dim"
                    aria-label={`Ask ${config.ai.name || "Shift Copilot"}`}
                  />
                  <div className="flex items-center justify-between px-3 pb-3 pt-1">
                    <ComposerCompanyPill onAdd={() => setUrlMode(true)} />
                    <button
                      type="submit"
                      aria-label="Ask"
                      disabled={!question.trim()}
                      className="ml-auto flex h-10 w-10 items-center justify-center rounded-[2px] bg-acid text-[#0a0a08] transition hover:bg-acid-dim active:scale-95 disabled:bg-raised disabled:text-dim"
                    >
                      <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                  </div>
                </form>
              )}
              {!urlMode && <CompanyDetectStrip text={question} />}

              <ul className="mt-4 border-t border-border">
                {chips.map((s) => (
                  <li key={s} className="border-b border-border last:border-b-0">
                    <button
                      onClick={() => ask(s)}
                      className="group flex w-full items-center justify-between gap-4 py-3 text-left text-[15px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {s}
                      <span className="font-mono text-acid opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true">
                        →
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Stats: hairline grid, big numerals */}
        <dl className="relative mx-auto grid max-w-[1360px] grid-cols-2 border-t border-border md:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={cn("px-5 py-7 md:px-8", i % 2 === 1 && "border-l border-border", i > 1 && "max-md:border-t max-md:border-border", i > 0 && "md:border-l md:border-border")}
            >
              <dd className="sx-display text-[52px] md:text-[64px]">{s.n}</dd>
              <dt className="sx-label mt-2 text-muted-foreground">{s.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Episodes ─────────────────────────────────────────────────────── */}
      <section id="episodes" className="scroll-mt-24 border-b border-border">
        <div className="mx-auto max-w-[1360px] px-5 py-16 md:px-8 md:py-24">
          <p className="sx-label sx-eyebrow">Every episode</p>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
            <h2 className="sx-display text-[clamp(44px,5.6vw,80px)]">
              What worked. <span className="text-dim">What broke.</span>
            </h2>
            <p className="max-w-md text-[17px] leading-[1.65] text-muted-foreground">
              Each one is transcribed, split into chapters and searchable. Open an episode to read along, or ask about
              it from the panel beside the video.
            </p>
          </div>

          <ol className="mt-12 border-t border-border">
            {EPISODES.map((ep) => {
              const link = links[ep.youtubeId];
              const row = (
                <div className="group grid grid-cols-[64px_minmax(0,1fr)] items-start gap-x-5 gap-y-3 border-b border-border py-8 transition-colors hover:bg-surface md:grid-cols-[104px_minmax(0,1fr)_200px_120px] md:items-center md:gap-x-8 md:px-4">
                  <span className={cn("sx-display text-[56px] md:text-[72px] transition-colors", link ? "text-[#3a3a35] group-hover:text-acid" : "text-[#2e2e2a]")}>
                    {String(ep.number).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <p className="sx-label flex flex-wrap items-center gap-x-2.5 text-foreground">
                      <Face slug={ep.guest.slug} name={ep.guest.name} size={26} />
                      {ep.guest.name}
                      <span className="text-dim">·</span>
                      <span className="text-muted-foreground">{ep.guest.company}</span>
                    </p>
                    <h3 className="mt-2.5 text-[21px] font-normal leading-[1.25] text-foreground md:text-[23px]">{ep.headline}</h3>
                    <p className="mt-2 line-clamp-2 max-w-[46rem] text-[15px] leading-[1.6] text-muted-foreground">{ep.hook}</p>
                  </div>
                  <p className="sx-label col-start-2 whitespace-nowrap text-dim md:col-start-auto">
                    {dateLabel(ep.date)}
                    <span className="md:block">
                      <span className="md:hidden"> · </span>
                      {Math.round(ep.duration / 60)} min · {ep.chapters.length} chapters
                    </span>
                  </p>
                  <span
                    className={cn(
                      "sx-btn sx-btn-ghost col-start-2 w-fit md:col-start-auto md:justify-self-end",
                      link ? "group-hover:border-acid group-hover:text-acid" : "opacity-50"
                    )}
                  >
                    {link ? (
                      <>
                        <Play className="h-3 w-3 fill-current" aria-hidden="true" /> Play
                      </>
                    ) : (
                      "Importing"
                    )}
                  </span>
                </div>
              );
              return (
                <li key={ep.youtubeId}>
                  {link ? (
                    <Link href={`/v/${link.slug}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid">
                      {row}
                    </Link>
                  ) : (
                    row
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ── Connect ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="sx-glow pointer-events-none absolute -bottom-72 -left-40 h-[700px] w-[700px]" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-[1360px] gap-10 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
          <div>
            <p className="sx-label sx-eyebrow">For members · MCP knowledge base</p>
            <h2 className="sx-display mt-6 text-[clamp(44px,5.6vw,80px)]">
              Take the library <span className="text-acid">into Claude.</span>
            </h2>
            <p className="mt-6 max-w-xl text-[17px] leading-[1.65] text-muted-foreground">
              Add Shift AI as a connector and ask from wherever you already work. Same episodes, same citations, with a
              link back to the second it was said.
            </p>
            <Link href="/connect" className="sx-btn mt-8">
              Connect it <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="border border-border border-l-[3px] border-l-acid bg-surface p-6 font-mono text-[13px] leading-[1.9] text-muted-foreground md:p-8">
            <p className="text-dim">You, in Claude</p>
            <p className="mt-1 text-foreground">We’re at €4M ARR on per-seat pricing. Who on the show moved off it, and how?</p>
            <p className="mt-5 text-dim">Claude, using Shift AI</p>
            <p className="mt-1">
              <span className="text-foreground">Olivier Pailhès (Aircall)</span> prices voice agents per minute for SMB and on outcomes for
              enterprise <span className="text-acid">▶ 12:59</span>. <span className="text-foreground">Aleks Đekić (Alguna)</span> thinks
              outcome-based pricing is further away than LinkedIn suggests <span className="text-acid">▶ 15:24</span>…
            </p>
            <p className="sx-label mt-6 !text-[10px] text-dim">Illustration. Your answers come from the real transcripts.</p>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-4 px-5 py-8 md:px-8">
        <p className="sx-label text-dim">A private demo for Shift AI, built on Bold</p>
        <p className="sx-label text-dim">
          <a href="https://www.shiftai.events" target="_blank" rel="noopener" className="hover:text-foreground">
            shiftai.events
          </a>
          <span className="mx-3">·</span>
          <a href="https://boldvideo.com" target="_blank" rel="noopener" className="hover:text-foreground">
            boldvideo.com
          </a>
        </p>
      </footer>
    </div>
  );
}
