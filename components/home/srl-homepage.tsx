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
        <div className="mx-auto w-full max-w-[1180px] px-4 pb-24 pt-16 text-center sm:px-6 sm:pb-32 sm:pt-24 lg:px-8">
          <span className="srl-badge">Startup Requests Live · On Demand</span>

          <h1 className="mx-auto mt-6 font-heading text-[clamp(2.1rem,4.6vw,3rem)] font-bold leading-[1.25]">
            Ask us anything.
            <br />
            <span className="srl-gradient-text">
              We&rsquo;ve probably answered it live.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-[640px] text-[17px] leading-relaxed text-muted-foreground sm:text-lg">
            The show where real founders get real answers.
            {stats && (
              <span className="block">
                {stats.count} episodes · {stats.hours}+ hours with Ed, Wil
                &amp; Ryan.
              </span>
            )}
          </p>

          <SrlAnswerDesk className="mx-auto mt-12 max-w-[680px]" />

          <p className="mt-6 text-[13px] text-muted-foreground/80">
            Answers cite the exact episode moments — one click jumps you to the
            clip.
          </p>
        </div>
      </section>

      {/* ── Latest episodes — their "Latest Startup Requests" band ──── */}
      <section className="border-b border-border">
        <div className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-24 lg:px-8">
          <div className="text-center">
            <h2 className="font-heading text-[clamp(1.75rem,3vw,2.25rem)] font-bold leading-[1.22]">
              Latest Startup Requests
            </h2>
            <p className="mx-auto mt-4 max-w-[560px] text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Fresh from the show — real founders, real teardowns, no theory.
            </p>
          </div>

          <div className="no-scrollbar -mx-4 mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-2 md:gap-x-6 md:gap-y-12 md:overflow-visible md:px-0 lg:grid-cols-4">
            {latest.map((video, i) => (
              <div
                key={video.id}
                className="w-[78%] shrink-0 snap-start sm:w-[52%] md:w-auto"
              >
                <SrlVideoCard video={video} priority={i < 2} />
              </div>
            ))}
          </div>

          <div className="mt-14 flex justify-center">
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

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col items-center justify-between gap-6 px-4 pb-12 pt-10 sm:flex-row sm:px-6 lg:px-8">
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
