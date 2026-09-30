/**
 * The arcade's staff. Shared by the homepage coach select and the answer
 * page, which tags each clip with the coach who teaches it.
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
  /** Character-select stat bars, 0–5 */
  stats: [string, number][];
  /** Their signature move, from their own sessions */
  special: string;
  cta: { label: string; href: string; external?: boolean };
  tone: Tone;
}

export const COACHES: Coach[] = [
  {
    slug: "cameron",
    name: "Cameron Brown",
    role: "Outbound",
    title: "The volume player",
    bio: "Runs The GTM Company. Plays outbound like a high-score run: 24 sends per win, and he won't let you press send until your deliverability passes inspection.",
    stats: [["Outbound", 5], ["Deliverability", 5], ["Patience", 3]],
    special: "24:1 system",
    match: /Cameron Brown|Cameron (walks|provides|breaks)/,
    cta: { label: "Ask Cameron", href: `/ask?q=${encodeURIComponent("What is the 24:1 outbound system and how do I run it?")}` },
    tone: "cyan",
  },
  {
    slug: "drew",
    name: "Drew Williams",
    role: "Sales",
    title: "Demo master",
    bio: "Bans feature dumps on sight. Buyers don't buy because they saw everything; they buy because they saw themselves. Then he makes you pause.",
    stats: [["Demos", 5], ["Urgency", 4], ["Feature dumps", 0]],
    special: "The pause",
    match: /Drew Williams|Coach Drew/,
    cta: { label: "Ask Drew", href: `/ask?q=${encodeURIComponent("How do I create urgency without being salesy?")}` },
    tone: "pink",
  },
  {
    slug: "joel",
    name: "Joel Smith",
    role: "Product & growth UX",
    title: "Level designer",
    bio: "Three-time founder. Asks what job your product was hired to do before he lets you bolt on another feature. Draws the map before you play the level.",
    stats: [["Product UX", 5], ["Onboarding", 4], ["New features", 1]],
    special: "Jobs to be done",
    match: /Joel Smith|Coach Joel|\bJoel (works|guides|explores)/,
    cta: { label: "Ask Joel", href: `/ask?q=${encodeURIComponent("How do I make my product's value impossible to miss?")}` },
    tone: "orange",
  },
  {
    slug: "vanessa",
    name: "Vanessa Roberts",
    role: "FounderWell",
    title: "Owns the arcade",
    bio: "Four-time founder, three exits, resident shrink. Keeps your head in the game when a level gets hard, and reminds you that pausing is part of the run.",
    stat: "KEYS: ALL OF THEM",
    stats: [["Founder wellness", 5], ["Exits", 3], ["Keys", 5]],
    special: "Be well, exit well",
    cta: { label: "FounderWell", href: "https://www.founderwell.com", external: true },
    tone: "yellow",
  },
  {
    slug: "marcel",
    name: "Marcel Fahle",
    role: "Bold",
    title: "Fixes the machines",
    bio: "Runs the tech. Built the machine that finds the exact minute of video you need. If a cabinet glitches, he's already inside it with a wrench.",
    stat: "WRENCH: ALWAYS",
    stats: [["Wrench", 5], ["Uptime", 4], ["Sleep", 1]],
    special: "Exact-minute search",
    cta: { label: "Bold", href: "https://www.boldvideo.com?utm_source=gtm-game&utm_medium=coaches", external: true },
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
