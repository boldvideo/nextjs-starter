import Link from "next/link";
import Image from "next/image";
import { Clapperboard, Play, MessageCircleQuestion } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import type { Video } from "@boldvideo/bold-js";
import { formatDuration } from "util/format-duration";
import { buildVideoUrl } from "@/lib/video-path";
import { SrlVideoCard } from "@/components/home/srl-video-card";

const HOSTS = [
  { initials: "EK", name: "Ed Kang", color: "#c65a3f" },
  { initials: "WS", name: "Wil Schroter", color: "#4a47a3" },
  { initials: "RR", name: "Ryan Rutan", color: "#2e8f7b" },
];

/**
 * The episode library in the startups.com /videos grammar: a breadcrumb
 * strip across the panel top, a featured band for the latest show, then
 * the full grid.
 */
export function SrlLibrary({ videos }: { videos: Video[] | null }) {
  const list = videos ?? [];
  const featured = list[0] ?? null;

  return (
    <div className="h-full overflow-y-auto overscroll-contain">
      {/* Breadcrumb strip, their exact panel-top pattern */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="flex h-[57px] items-center gap-3 px-4 sm:px-6">
          <span className="flex h-8 w-8 items-center justify-center rounded-[5.25px] border border-border text-muted-foreground">
            <Clapperboard className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <span className="text-[12.25px] font-bold text-muted-foreground">
            Episodes
          </span>
          {list.length > 0 && (
            <span className="ml-auto text-[12px] text-muted-foreground/80">
              {list.length} full {list.length === 1 ? "show" : "shows"}
            </span>
          )}
        </div>
      </div>

      {/* Featured: the latest request */}
      {featured && (
        <section className="border-b border-border">
          <div className="mx-auto grid w-full max-w-[1180px] items-center gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_minmax(0,480px)] lg:gap-12 lg:py-16 lg:pl-8 lg:pr-8">
            <div>
              <span className="srl-badge">Latest Request</span>
              <h1 className="mt-4 font-heading text-[clamp(1.6rem,3.2vw,2.4rem)] font-extrabold leading-[1.18] tracking-tight">
                {featured.title}
              </h1>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <div className="flex -space-x-2">
                  {HOSTS.map((host) => (
                    <span
                      key={host.initials}
                      title={host.name}
                      className="flex h-9 w-9 items-center justify-center rounded-full font-heading text-[11px] font-bold text-white ring-2 ring-background"
                      style={{ backgroundColor: host.color }}
                    >
                      {host.initials}
                    </span>
                  ))}
                </div>
                <span className="font-heading text-[15px] font-bold">
                  Ed, Wil &amp; Ryan
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatDuration(featured.duration)} ·{" "}
                  {formatDistanceToNowStrict(new Date(featured.publishedAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href={buildVideoUrl(featured)}
                  className="flex h-11 items-center gap-2 rounded-[6px] bg-purple px-5 font-heading text-[15px] font-medium text-purple-foreground transition-opacity hover:opacity-90"
                >
                  <Play className="h-4 w-4 fill-current" strokeWidth={0} />
                  Watch the Show
                </Link>
                <Link
                  href={`/ask?q=${encodeURIComponent(
                    `What did the guys cover in "${featured.title}"?`
                  )}`}
                  className="flex h-11 items-center gap-2 rounded-[5.25px] border border-border-strong px-4 text-sm font-medium transition-colors hover:bg-muted"
                >
                  <MessageCircleQuestion
                    className="h-4 w-4"
                    strokeWidth={1.75}
                  />
                  Ask about this one
                </Link>
              </div>
            </div>
            <Link
              href={buildVideoUrl(featured)}
              className="group relative block aspect-video overflow-hidden rounded-xl border border-border bg-muted shadow-[0_20px_44px_-20px_var(--shadow)]"
            >
              <Image
                src={featured.thumbnail}
                alt=""
                fill
                priority
                sizes="(max-width: 1024px) 92vw, 480px"
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
              />
              <span className="absolute bottom-3 right-3 rounded-[5px] bg-black/85 px-1.5 py-0.5 font-heading text-xs font-semibold text-white">
                {formatDuration(featured.duration)}
              </span>
            </Link>
          </div>
        </section>
      )}

      {/* The grid */}
      <section>
        <div className="mx-auto w-full max-w-[1180px] px-4 pb-16 pt-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-heading text-[clamp(1.6rem,3vw,2.1rem)] font-extrabold leading-tight">
              Every Request, Every Show
            </h2>
            <p className="mx-auto mt-3 max-w-[560px] text-lg text-muted-foreground">
              Real founders on the mic, getting the answers everyone needs.
            </p>
          </div>

          {list.length > 0 ? (
            <div className="mt-10 grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((video, i) => (
                <SrlVideoCard key={video.id} video={video} priority={i < 3} />
              ))}
            </div>
          ) : (
            <p className="mt-10 text-center text-muted-foreground">
              Episodes are on the way — the first requests are being answered
              right now.
            </p>
          )}

          <div className="mt-14 rounded-lg border border-border bg-surface px-6 py-8 text-center">
            <h3 className="font-heading text-xl font-extrabold">
              Don&rsquo;t feel like browsing?
            </h3>
            <p className="mx-auto mt-2 max-w-[480px] text-[15px] text-muted-foreground">
              Ask the answer desk — it has watched every minute of every show
              and answers with the exact clips.
            </p>
            <Link
              href="/ask"
              className="mx-auto mt-5 flex h-11 w-fit items-center gap-1.5 rounded-[6px] bg-accent px-5 font-heading text-[15px] font-semibold text-[#09090b] transition-colors hover:bg-[var(--accent-hover)]"
            >
              Make a Request
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
