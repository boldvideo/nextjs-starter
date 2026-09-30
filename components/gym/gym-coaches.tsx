import Image from "next/image";
import Link from "next/link";
import type { Video } from "@boldvideo/bold-js";
import { cn } from "@/lib/utils";
import { COACHES, type Tone } from "./gym-coaches-data";
import { GymSecretCoach, GymSelectCard, StatBar } from "./gym-coach-select";

/**
 * Coach select. Three coaches whose sessions are in the game, plus the two
 * people who keep the arcade running, each with character-select stat bars.
 * The last slot is locked until someone enters the code.
 * Portraits are AI-polished from real photos/frames (public/gym/coaches).
 */

const TONE: Record<Tone, { text: string; ring: string }> = {
  pink: { text: "text-[var(--gym-pink)]", ring: "hover:border-[var(--gym-pink)] hover:shadow-[0_0_40px_-12px_var(--gym-pink)]" },
  cyan: { text: "text-[var(--gym-cyan)]", ring: "hover:border-[var(--gym-cyan)] hover:shadow-[0_0_40px_-12px_var(--gym-cyan)]" },
  orange: { text: "text-[var(--gym-orange)]", ring: "hover:border-[var(--gym-orange)] hover:shadow-[0_0_40px_-12px_var(--gym-orange)]" },
  yellow: { text: "text-[var(--gym-yellow)]", ring: "hover:border-[var(--gym-yellow)] hover:shadow-[0_0_40px_-12px_var(--gym-yellow)]" },
  violet: { text: "text-[#b58cff]", ring: "hover:border-[#b58cff] hover:shadow-[0_0_40px_-12px_#b58cff]" },
};

export function GymCoaches({ videos }: { videos: Video[] }) {
  const tapeCount = (re: RegExp) =>
    videos.filter((v) => re.test(`${v.title} ${v.description ?? ""}`)).length;

  return (
    <section className="relative z-10 px-4 py-16 md:py-24" aria-labelledby="gym-staff">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-10 md:mb-14">
          <p className="font-osd text-[20px] text-[var(--gym-cyan)] uppercase">Player 1</p>
          <h2 id="gym-staff" className="mt-2 font-display uppercase text-[32px] md:text-[48px] leading-none gym-sunset-text">
            Select your coach
          </h2>
          <p className="mt-4 text-muted-foreground max-w-[560px] mx-auto">
            Every answer comes from their sessions. The game master just finds the exact minute and hands you the next move.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {COACHES.map((c) => {
            const count = c.match ? tapeCount(c.match) : 0;
            const stat = c.stat ?? (count > 0 ? `IN ${count} ${count === 1 ? "SESSION" : "SESSIONS"}` : "IN THE GAME");
            return (
              <GymSelectCard
                key={c.slug}
                className={cn(
                  "group relative flex flex-col rounded-2xl p-5",
                  "bg-[color-mix(in_srgb,var(--gym-panel)_92%,transparent)] border border-[var(--gym-line)]",
                  "transition-[border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-1",
                  TONE[c.tone].ring
                )}
              >
                {/* The P1 cursor lands on whoever you hover */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-3 top-3 font-osd text-[18px] leading-none opacity-0 group-hover:opacity-100 group-hover:animate-[gym-blink_1.1s_steps(1)_infinite]",
                    TONE[c.tone].text
                  )}
                >
                  ▶ P1
                </span>
                <Image
                  src={`/gym/game/cast/${c.slug}.webp`}
                  alt={`${c.name}, ${c.title.toLowerCase()} at The GTM Game`}
                  width={240}
                  height={240}
                  className="mx-auto h-36 w-36 md:h-40 md:w-40 transition-transform duration-300 ease-out group-hover:scale-105 group-hover:-rotate-2"
                />
                <p className={cn("mt-4 font-osd text-[17px] leading-none uppercase", TONE[c.tone].text)}>
                  {c.role}
                </p>
                <h3 className="mt-1.5 font-display text-[17px] uppercase leading-tight text-foreground">
                  {c.name}
                </h3>
                <p className="mt-0.5 text-sm font-semibold text-foreground/80">{c.title}</p>
                <div className="mt-3 space-y-1.5">
                  {c.stats.map(([label, value]) => (
                    <StatBar key={label} label={label} value={value} tone={c.tone} />
                  ))}
                </div>
                <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground flex-1">{c.bio}</p>
                <p className="mt-3 font-osd text-[15px] leading-none uppercase text-foreground/70">
                  Special: <span className={TONE[c.tone].text}>{c.special}</span>
                </p>
                <div className="mt-4 pt-3 border-t border-[var(--gym-line)] flex items-center justify-between gap-2">
                  <span className="font-osd text-[16px] leading-none text-muted-foreground/80">{stat}</span>
                  {c.cta.external ? (
                    <a
                      href={c.cta.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn("text-[13px] font-semibold whitespace-nowrap hover:underline", TONE[c.tone].text)}
                    >
                      {c.cta.label} ↗
                    </a>
                  ) : (
                    <Link
                      href={c.cta.href}
                      prefetch={false}
                      className={cn("text-[13px] font-semibold whitespace-nowrap hover:underline", TONE[c.tone].text)}
                    >
                      {c.cta.label} →
                    </Link>
                  )}
                </div>
              </GymSelectCard>
            );
          })}
        </div>

        <GymSecretCoach />
      </div>
    </section>
  );
}
