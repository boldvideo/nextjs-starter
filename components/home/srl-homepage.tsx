import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import type { Video } from "@boldvideo/bold-js";
import { PortalSettings, PortalConfig } from "@/lib/portal-config";
import { SrlAnswerDesk } from "@/components/home/srl-answer-desk";
import { SrlVideoCard } from "@/components/home/srl-video-card";
import { PoweredByBold } from "@/components/powered-by-bold";

export interface LibraryStats {
  count: number;
  hours: number;
  minutes: number;
}

interface SrlHomepageProps {
  settings: PortalSettings | null;
  config: PortalConfig;
  videos: Video[] | null;
  stats: LibraryStats | null;
}

const HOW_STEPS = [
  {
    title: "Ask anything",
    body: "Type it like you'd ask the guys live — pitch deck, raise, go-to-market, anything.",
  },
  {
    title: "We find the moments",
    body: "The desk has watched every episode. It pulls the exact clips where the guys tackled it.",
  },
  {
    title: "Watch the real thing",
    body: "Every answer comes with receipts — one click drops you into the episode, right at the moment.",
  },
];

export function SrlHomepage({
  settings,
  videos,
  stats,
}: SrlHomepageProps) {
  const latest = (videos ?? []).slice(0, 4);

  return (
    <div className="h-full overflow-y-auto overscroll-contain">
      {/* ── Hero: their two-line headline formula + the request desk ── */}
      <section className="border-b border-border">
        <div className="mx-auto w-full max-w-[1180px] px-4 pb-16 pt-12 text-center sm:px-6 sm:pt-16 lg:px-8">
          <span className="srl-badge">
            <span
              aria-hidden="true"
              className="animate-srl-live h-[7px] w-[7px] rounded-full"
              style={{ backgroundColor: "var(--error)" }}
            />
            Startup Requests Live · On Demand
          </span>

          <h1 className="mx-auto mt-6 font-heading text-[clamp(2.1rem,4.6vw,3rem)] font-bold leading-[1.25]">
            Ask us anything.
            <br />
            <span className="srl-gradient-text">
              We&rsquo;ve probably answered it live.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-[640px] text-[17px] leading-relaxed text-muted-foreground sm:text-lg">
            The show where real founders get real answers — now searchable.
            {stats && (
              <span className="block">
                {stats.count} episodes · {stats.hours}+ hours with Ed, Wil
                &amp; Ryan.
              </span>
            )}
          </p>

          <SrlAnswerDesk className="mx-auto mt-10 max-w-[680px]" />

          <p className="mt-5 text-[13px] text-muted-foreground/80">
            Answers cite the exact episode moments — one click jumps you to the
            clip.
          </p>
        </div>
      </section>

      {/* ── Latest episodes — their "Latest Startup Requests" band ──── */}
      <section className="border-b border-border">
        <div className="mx-auto w-full max-w-[1180px] px-4 pb-16 pt-14 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-heading text-[clamp(1.9rem,4vw,3rem)] font-bold leading-[1.25]">
              Latest Startup Requests
            </h2>
            <p className="srl-sub mx-auto mt-3 max-w-[680px] text-[clamp(1.2rem,2.3vw,1.875rem)] leading-[1.5]">
              Fresh from the show — real founders, real teardowns, no theory.
            </p>
          </div>

          <div className="no-scrollbar -mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-4 lg:gap-5">
            {latest.map((video, i) => (
              <div
                key={video.id}
                className="w-[78%] shrink-0 snap-start sm:w-[52%] md:w-auto"
              >
                <SrlVideoCard video={video} priority={i < 2} />
              </div>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <Link
              href="/videos"
              className="flex h-11 items-center gap-1.5 rounded-[6px] bg-purple px-5 font-heading text-[15px] font-medium text-purple-foreground transition-opacity hover:opacity-90"
            >
              Browse All Episodes
              <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="mx-auto w-full max-w-[1180px] px-4 pb-16 pt-14 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-heading text-[clamp(1.9rem,4vw,3rem)] font-bold leading-[1.25]">
              How It Works
            </h2>
            <p className="srl-sub mx-auto mt-3 max-w-[640px] text-[clamp(1.2rem,2.3vw,1.875rem)] leading-[1.5]">
              You type what you need. The show answers.
            </p>
          </div>

          <div className="mt-12 flex flex-col items-stretch gap-6 md:flex-row md:items-start md:gap-0">
            {HOW_STEPS.map((step, i) => (
              <div key={step.title} className="contents">
                {i > 0 && (
                  <div
                    aria-hidden="true"
                    className="mt-[22px] hidden h-0 flex-1 border-t-2 border-dashed border-border-strong/60 md:block md:max-w-[72px]"
                  />
                )}
                <div className="flex flex-1 flex-col items-center px-2 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border-strong bg-muted font-heading text-[15px] font-bold text-[var(--accent-active)]">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 font-heading text-[17px] font-bold">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-[300px] text-[15px] leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col items-center justify-between gap-5 px-4 pb-10 pt-8 sm:flex-row sm:px-6 lg:px-8">
          <a
            href="https://www.startups.com"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-opacity hover:opacity-85"
          >
            <Image
              src={settings?.logoUrl || "/startups-wordmark.svg"}
              alt="startups.com"
              width={140}
              height={40}
              className="h-8 w-auto"
            />
          </a>
          <div className="text-center">
            <p className="font-heading text-sm font-bold">
              SRL — Startup Requests Live
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Hosted by Ed Kang, Wil Schroter &amp; Ryan Rutan · every episode,
              one question away.
            </p>
          </div>
          <PoweredByBold variant="quiet" />
        </div>
      </footer>
    </div>
  );
}
