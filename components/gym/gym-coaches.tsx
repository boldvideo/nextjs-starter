import Image from "next/image";
import Link from "next/link";
import type { Video } from "@boldvideo/bold-js";
import { cn } from "@/lib/utils";

/**
 * The staff. Three coaches whose sessions are on tape, plus the two people
 * who keep the building standing. Portraits are AI-polished from real
 * photos/frames in the gym's synthwave style (public/gym/coaches).
 */

type Tone = "pink" | "cyan" | "orange" | "yellow" | "violet";

interface Coach {
  slug: string;
  name: string;
  role: string;
  title: string;
  bio: string;
  /** Matches sessions this coach leads (by name in the title/description) */
  match?: RegExp;
  /** Static stat for staff without sessions (clearly a joke) */
  stat?: string;
  cta: { label: string; href: string; external?: boolean };
  tone: Tone;
}

const COACHES: Coach[] = [
  {
    slug: "cameron",
    name: "Cameron Brown",
    role: "Outbound",
    title: "Cardio coach",
    bio: "Runs The GTM Company. Treats 24 cold emails as one warm-up set, and won't let you near the send button until your deliverability passes inspection.",
    match: /Cameron Brown|Cameron (walks|provides|breaks)/,
    cta: { label: "Ask his tape", href: `/ask?q=${encodeURIComponent("What is the 24:1 outbound system and how do I run it?")}` },
    tone: "cyan",
  },
  {
    slug: "drew",
    name: "Drew Williams",
    role: "Sales",
    title: "Sparring partner",
    bio: "Bans feature dumps on sight. Buyers don't buy because they saw everything; they buy because they saw themselves. Then he makes you pause.",
    match: /Drew Williams|Coach Drew/,
    cta: { label: "Ask his tape", href: `/ask?q=${encodeURIComponent("How do I create urgency without being salesy?")}` },
    tone: "pink",
  },
  {
    slug: "joel",
    name: "Joel Smith",
    role: "Product & growth UX",
    title: "Form coach",
    bio: "Three-time founder. Asks what job your product was hired to do before he lets you bolt on another feature. Checks your form, every rep.",
    match: /Joel Smith|Coach Joel|\bJoel (works|guides|explores)/,
    cta: { label: "Ask his tape", href: `/ask?q=${encodeURIComponent("How do I make my product's value impossible to miss?")}` },
    tone: "orange",
  },
  {
    slug: "vanessa",
    name: "Vanessa Roberts",
    role: "FounderWell",
    title: "Owns the building",
    bio: "Four-time founder, three exits, resident shrink. Keeps your head in the game when the reps get heavy and the momentum going when you'd rather skip leg day.",
    stat: "KEYS: ALL OF THEM",
    cta: { label: "FounderWell", href: "https://www.founderwell.com", external: true },
    tone: "yellow",
  },
  {
    slug: "marcel",
    name: "Marcel Fahle",
    role: "Bold",
    title: "Keeps the stack oiled",
    bio: "Runs the tech. Built the machine that finds the exact minute of tape you need. If a rep glitches, he's already under it with a wrench.",
    stat: "WRENCH: ALWAYS",
    cta: { label: "Bold", href: "https://www.boldvideo.com?utm_source=gtm-gym&utm_medium=coaches", external: true },
    tone: "violet",
  },
];

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
          <p className="font-osd text-[20px] text-[var(--gym-cyan)] uppercase">The staff</p>
          <h2 id="gym-staff" className="mt-2 font-display uppercase text-[32px] md:text-[48px] leading-none gym-sunset-text">
            Meet your coaches
          </h2>
          <p className="mt-4 text-muted-foreground max-w-[560px] mx-auto">
            Every answer comes off their tape. The coach just finds the exact minute and yells at you to do the rep.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {COACHES.map((c) => {
            const count = c.match ? tapeCount(c.match) : 0;
            const stat = c.stat ?? (count > 0 ? `IN ${count} ${count === 1 ? "SESSION" : "SESSIONS"}` : "ON TAPE");
            return (
              <article
                key={c.slug}
                className={cn(
                  "group relative flex flex-col rounded-2xl p-5",
                  "bg-[color-mix(in_srgb,var(--gym-panel)_92%,transparent)] border border-[var(--gym-line)]",
                  "transition-[border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-1",
                  TONE[c.tone].ring
                )}
              >
                <Image
                  src={`/gym/coaches/${c.slug}.webp`}
                  alt={`${c.name}, ${c.title.toLowerCase()} at The GTM Gym`}
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
                <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground flex-1">{c.bio}</p>
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
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
