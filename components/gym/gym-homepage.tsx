import Link from "next/link";
import type { Video } from "@boldvideo/bold-js";
import { GymBackdrop } from "./gym-backdrop";
import { GymAskHero } from "./gym-ask-hero";
import { GymOsd } from "./gym-osd";
import { PoweredByBold } from "@/components/powered-by-bold";

interface GymHomepageProps {
  videos: Video[];
  disclaimer?: string;
}

/**
 * The whole homepage is the ask. Outrun set in the back, coach up front,
 * the tape rolling along the floor.
 */
export function GymHomepage({ videos, disclaimer }: GymHomepageProps) {
  const sessions = videos.length;
  const totalSeconds = videos.reduce((sum, v) => sum + (v.duration || 0), 0);
  const hours = totalSeconds > 0 ? Math.round(totalSeconds / 3600) : undefined;

  // Long-form sessions make the best marquee; shuffle-free for ISR stability
  const tape = videos.filter((v) => (v.duration || 0) > 600).slice(0, 18);

  return (
    <div className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
      <div className="relative min-h-full flex flex-col overflow-hidden">
        <GymBackdrop />

        <GymOsd sessions={sessions} />

        <section className="relative z-10 flex-1 flex items-center px-4 pt-14 pb-8 md:pt-12 md:pb-10">
          <GymAskHero sessions={sessions} hours={hours} />
        </section>

        {tape.length > 0 && (
          <div className="relative z-10 border-y border-[var(--gym-line)] bg-[color-mix(in_srgb,var(--gym-night)_88%,transparent)] overflow-hidden">
            <div className="gym-marquee py-2.5">
              {[0, 1].map((copy) => (
                <div key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1}>
                  <span className="font-osd text-[19px] text-[var(--gym-pink)] px-5 whitespace-nowrap">
                    ▶ NOW ON THE FLOOR
                  </span>
                  {tape.map((v) => (
                    <Link
                      key={`${copy}-${v.id}`}
                      href={`/v/${v.id}`}
                      prefetch={false}
                      tabIndex={copy === 1 ? -1 : undefined}
                      className="flex items-center gap-5 px-5 whitespace-nowrap text-sm font-medium text-foreground/75 hover:text-[var(--gym-cyan)] transition-colors"
                    >
                      <span className="text-[var(--gym-yellow)]">★</span>
                      {v.title}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        <footer className="relative z-10 px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-2 max-w-[1440px] w-full mx-auto text-xs text-muted-foreground/70">
          <p className="text-center md:text-left">
            {disclaimer ||
              "A demo program. Training videos licensed from FounderWell."}
          </p>
          <PoweredByBold variant="pitch" />
        </footer>
      </div>
    </div>
  );
}
