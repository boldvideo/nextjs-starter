/**
 * The gym's staff. Shared by the homepage roster and the answer page, which
 * tags each clip with the coach who teaches it.
 */

export type Tone = "pink" | "cyan" | "orange" | "yellow" | "violet";

export interface Coach {
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

export const COACHES: Coach[] = [
  {
    slug: "cameron",
    name: "Cameron Brown",
    role: "Outbound",
    title: "Cardio coach",
    bio: "Runs The GTM Company. Treats 24 cold emails as one warm-up set, and won't let you near the send button until your deliverability passes inspection.",
    match: /Cameron Brown|Cameron (walks|provides|breaks)/,
    cta: { label: "Ask Cameron", href: `/ask?q=${encodeURIComponent("What is the 24:1 outbound system and how do I run it?")}` },
    tone: "cyan",
  },
  {
    slug: "drew",
    name: "Drew Williams",
    role: "Sales",
    title: "Sparring partner",
    bio: "Bans feature dumps on sight. Buyers don't buy because they saw everything; they buy because they saw themselves. Then he makes you pause.",
    match: /Drew Williams|Coach Drew/,
    cta: { label: "Ask Drew", href: `/ask?q=${encodeURIComponent("How do I create urgency without being salesy?")}` },
    tone: "pink",
  },
  {
    slug: "joel",
    name: "Joel Smith",
    role: "Product & growth UX",
    title: "Form coach",
    bio: "Three-time founder. Asks what job your product was hired to do before he lets you bolt on another feature. Checks your form, every rep.",
    match: /Joel Smith|Coach Joel|\bJoel (works|guides|explores)/,
    cta: { label: "Ask Joel", href: `/ask?q=${encodeURIComponent("How do I make my product's value impossible to miss?")}` },
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

/** Short name used on clips and drills ("Coach Drew") */
export function coachLabel(coach: Coach): string {
  return `Coach ${coach.name.split(" ")[0]}`;
}

/** The coach leading a session, from its title + description (first match wins) */
export function coachForVideo(video: { title?: string | null; description?: string | null }): Coach | null {
  const text = `${video.title ?? ""} ${video.description ?? ""}`;
  let best: { coach: Coach; at: number } | null = null;
  for (const coach of COACHES) {
    if (!coach.match) continue;
    const m = coach.match.exec(text);
    if (m && (!best || m.index < best.at)) best = { coach, at: m.index };
  }
  return best?.coach ?? null;
}
