import Link from "next/link";
import Image from "next/image";
import type { Video } from "@boldvideo/bold-js";
import { PortalSettings, PortalConfig } from "@/lib/portal-config";
import { TakiChat, type TakiChatChip } from "@/components/home/taki-chat";
import { TakiVideoCard } from "@/components/home/taki-video-card";
import { MarkerUnderline, StepArrow } from "@/components/home/taki-doodles";
import { PoweredByBold } from "@/components/powered-by-bold";

export interface LibraryStats {
  count: number;
  hours: number;
  minutes: number;
}

interface TakiHomepageProps {
  settings: PortalSettings | null;
  config: PortalConfig;
  videos: Video[] | null;
  stats: LibraryStats | null;
}

/**
 * Short handwritten chip labels for the configured conversation starters.
 * Labels are curated (the starters run long); each keeps sending the full
 * question to /ask. Falls back to the raw starters if the config changes.
 */
function buildChips(starters: string[]): TakiChatChip[] {
  const curated: { label: string; match: RegExp }[] = [
    { label: "high-ticket, no sales calls", match: /sales calls/i },
    { label: "fix my lead magnet", match: /lead magnet/i },
    { label: "what should I do every day?", match: /every day/i },
  ];
  const chips: TakiChatChip[] = [];
  for (const c of curated) {
    const question = starters.find((s) => c.match.test(s));
    if (question) chips.push({ label: c.label, question });
  }
  return chips.length > 0
    ? chips
    : starters.slice(0, 3).map((q) => ({ label: q, question: q }));
}

function buildHowSteps(stats: LibraryStats | null) {
  return [
    {
      title: "YOU ASK",
      body: "Type it like you'd say it on a coaching call. Messy is fine. Messy is normal.",
      tilt: "-rotate-1",
    },
    {
      title: "IT FINDS THE MOMENT",
      body: stats
        ? `It searches all ${stats.minutes.toLocaleString("en-US")} minutes of the library for the times Taki has answered this before.`
        : "It searches every minute of every video for the times Taki has answered this before.",
      tilt: "rotate-[0.8deg]",
    },
    {
      title: "ANSWER + RECEIPTS",
      body: "You get the play in Taki's voice — with the exact clips, timestamped, so you can watch the real thing.",
      tilt: "-rotate-[0.6deg]",
    },
  ];
}

export function TakiHomepage({
  settings,
  config,
  videos,
  stats,
}: TakiHomepageProps) {
  const latest = (videos ?? []).slice(0, 4);
  const chips = buildChips(config.ai.conversationStarters);
  const count = stats?.count ?? null;
  const howSteps = buildHowSteps(stats);

  return (
    <div className="h-full overflow-y-auto overscroll-contain">
      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative flex min-h-[calc(100dvh-var(--header-height)-1px)] flex-col overflow-hidden border-b border-border">
        {/* Whiteboard dot paper */}
        <div aria-hidden="true" className="taki-dotgrid absolute inset-0" />

        {/* Taki stands on the hero's bottom edge, beside the chat.
            The radial mask dissolves the photo's hard crops (the clipped
            elbow, the waist) into the page. */}
        <div className="pointer-events-none absolute bottom-0 left-[calc(50%+96px)] hidden select-none lg:block">
          <Image
            src="/taki-cutout.webp"
            alt="Taki Moore, marker in hand"
            width={880}
            height={1321}
            priority
            className="h-[min(64vh,560px)] w-auto drop-shadow-[0_24px_44px_rgba(22,21,15,0.2)] [mask-composite:intersect] [mask-image:linear-gradient(to_top,transparent_0%,black_9%),linear-gradient(to_right,transparent_1.5%,black_15%),linear-gradient(to_left,transparent_0.5%,black_10%)]"
          />
        </div>

        <div className="relative mx-auto flex w-full max-w-[1120px] flex-1 flex-col items-center justify-center px-4 pb-8 pt-4 sm:px-6 sm:pt-8 lg:px-8 lg:pb-14">
          <div className="w-full lg:max-w-[960px]">
            <div className="relative w-full lg:max-w-[620px]">
              {/* Headline — centered on the chat column, allowed to
                  overflow it symmetrically on large screens */}
              <div className="relative mx-auto text-center lg:left-1/2 lg:w-max lg:max-w-none lg:-translate-x-1/2 lg:whitespace-nowrap">
                <p className="font-scribble rotate-[-2deg] text-[clamp(1.35rem,2.2vw,1.6rem)] text-muted-foreground">
                  hey coach 👋
                </p>
                <h1 className="font-marker mt-1 -rotate-1 text-[clamp(2.75rem,6.5vw,4.6rem)] leading-[0.98] text-foreground">
                  ASK ME{" "}
                  <span className="relative inline-block">
                    ANYTHING.
                    <MarkerUnderline
                      className="absolute -bottom-2 left-[-2%] h-[0.2em] w-[104%] text-accent"
                      delay={0.5}
                    />
                  </span>
                </h1>
                {stats && (
                  <p className="mt-3 font-mono text-[11px] text-muted-foreground/80 sm:mt-4 sm:text-[13px]">
                    {stats.count} videos · {stats.hours} hours of brandwidth ·
                    1 slightly opinionated coach
                  </p>
                )}
              </div>

              {/* Chat stage. On mobile Taki peeks over the card. */}
              <div className="relative mt-[118px] lg:mt-9">
                <div className="pointer-events-none absolute -top-[112px] right-2 select-none lg:hidden">
                  <Image
                    src="/taki-cutout.webp"
                    alt="Taki Moore, marker in hand"
                    width={880}
                    height={1321}
                    priority
                    className="h-[258px] w-auto drop-shadow-[0_10px_22px_rgba(22,21,15,0.25)]"
                  />
                </div>
                <TakiChat
                  aiName={
                    config.ai.name === "Taki" ? "Taki AI" : config.ai.name
                  }
                  avatarUrl={config.ai.avatar}
                  videoCount={count}
                  chips={chips}
                  className="relative z-10 lg:-rotate-[0.4deg]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8">

        {/* ── Latest videos ────────────────────────────────────── */}
        <section className="pb-6 pt-16 lg:pt-20">
          <div className="mb-8 flex flex-wrap items-baseline gap-x-5 gap-y-2">
            <h2 className="font-marker -rotate-1 text-[clamp(1.9rem,4vw,2.9rem)] leading-none">
              IT&rsquo;S ALL IN HERE.
            </h2>
            <p className="font-scribble rotate-[-1.5deg] text-[clamp(1.25rem,2vw,1.45rem)] text-foreground/75">
              triage calls, offer diamonds, dead funnels →
            </p>
          </div>

          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-4 lg:gap-5">
            {latest.map((video, i) => (
              <div
                key={video.id}
                className="w-[76%] shrink-0 snap-start sm:w-[52%] md:w-auto"
              >
                <TakiVideoCard video={video} priority={i < 2} />
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center md:justify-end">
            <Link
              href="/videos"
              className="group text-[15px] font-semibold decoration-accent decoration-[3px] underline-offset-4 hover:underline"
            >
              Browse {count ? `all ${count} videos` : "the full library"}{" "}
              <span
                aria-hidden="true"
                className="inline-block transition-transform group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────── */}
        <section className="pb-4 pt-16 lg:pt-24">
          <div className="mb-10 flex flex-wrap items-baseline gap-x-5 gap-y-2">
            <h2 className="font-marker -rotate-1 text-[clamp(1.9rem,4vw,2.9rem)] leading-none">
              NO MAGIC. JUST MEMORY.
            </h2>
            <p className="font-scribble rotate-[-2deg] text-[clamp(1.25rem,2vw,1.45rem)] text-muted-foreground">
              how it actually works
            </p>
          </div>

          <div className="flex flex-col items-stretch justify-center gap-4 md:flex-row md:items-center md:gap-2">
            {howSteps.map((step, i) => (
              <div key={step.title} className="contents">
                {i > 0 && (
                  <StepArrow
                    className="hidden h-11 w-16 shrink-0 text-accent md:block"
                    delay={0.2 + i * 0.3}
                  />
                )}
                <div
                  className={`max-w-[340px] rounded-2xl border-2 border-foreground/80 bg-surface px-6 py-5 ${step.tilt} md:flex-1`}
                >
                  <div className="font-scribble text-lg text-foreground/75">
                    step {i + 1}.
                  </div>
                  <h3 className="font-marker mt-1 text-[21px] leading-tight">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────── */}
        <section className="pb-20 pt-20 text-center lg:pb-28 lg:pt-28">
          <h2 className="font-marker -rotate-1 text-[clamp(2.4rem,5.5vw,4rem)] leading-[1.08]">
            COACHES DON&rsquo;T SCALE.
            <br />
            <span className="relative inline-block px-2">
              <span
                aria-hidden="true"
                className="absolute inset-x-0 inset-y-[6%] -skew-x-3 rounded-[0.15em] bg-accent"
              />
              <span className="relative">THIS DOES.</span>
            </span>
          </h2>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
            <Link
              href="/ask"
              className="font-marker -rotate-1 rounded-2xl bg-accent px-8 py-4 text-[19px] text-accent-foreground shadow-[0_3px_0_rgba(22,21,15,0.3)] transition-transform hover:rotate-1 hover:scale-[1.04]"
            >
              ASK YOUR FIRST QUESTION
            </Link>
            <p className="font-scribble rotate-[-2deg] text-xl text-muted-foreground">
              no funnel. promise.
            </p>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────── */}
        <footer className="flex flex-col items-center justify-between gap-5 border-t border-border pb-12 pt-8 sm:flex-row">
          {settings?.logoUrl ? (
            <Image
              src={settings.logoUrl}
              alt="Million Dollar Coach"
              width={286}
              height={71}
              className="h-9 w-auto"
            />
          ) : (
            <span />
          )}
          <div className="text-center">
            <p className="font-scribble rotate-[-1.5deg] text-xl text-foreground/85">
              Taki Moore, out.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Well — the AI version. A Bold demo built on his real library.
            </p>
          </div>
          <PoweredByBold variant="quiet" />
        </footer>
      </div>
    </div>
  );
}
