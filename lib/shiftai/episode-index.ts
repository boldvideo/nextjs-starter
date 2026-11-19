import { EPISODES } from "./show";
import slugs from "./slugs.json";

// A static snapshot for client components (chat answers): which Bold video an
// episode is. slugs.json is written by scripts/shiftai-slugs after import.
export interface IndexedEpisode {
  key: string;
  number: number;
  slug: string | null;
  guest: string;
  guestSlug: string;
  company: string;
  headline: string;
}

const SLUGS = slugs as Record<string, string>;

export const EPISODE_INDEX: Record<string, IndexedEpisode> = Object.fromEntries(
  EPISODES.map((e) => [
    e.youtubeId,
    {
      key: e.youtubeId,
      number: e.number,
      slug: SLUGS[e.youtubeId] ?? null,
      guest: e.guest.name,
      guestSlug: e.guest.slug,
      company: e.guest.company,
      headline: e.headline,
    },
  ])
);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// "Olivier Pailhès" or "Olivier Pailhès (Aircall)"; accents optional because models drop them.
const loose = (s: string) =>
  escape(s)
    .replace(/[èéêë]/g, "[eèéêë]")
    .replace(/[Đđ]/g, "(?:Đ|đ|D|d)")
    .replace(/ć/g, "[cć]");
const BY_NAME = new Map(EPISODES.map((e) => [e.guest.name.normalize("NFKD").replace(/[^a-zA-Z ]/g, "").toLowerCase(), e.youtubeId]));
export const GUEST_RE = new RegExp(`(${EPISODES.map((e) => loose(e.guest.name)).join("|")})(\\s*\\([^)\\n]{1,40}\\))?`, "g");

export function episodeKeyForName(name: string): string | null {
  const k = name.replace(/Đ/g, "D").replace(/đ/g, "d").normalize("NFKD").replace(/[^a-zA-Z ]/g, "").toLowerCase();
  return BY_NAME.get(k) ?? null;
}

/** Episodes whose guest an answer names, in order of first mention. */
export function mentionedEpisodes(text: string): string[] {
  const out: string[] = [];
  GUEST_RE.lastIndex = 0;
  for (let m; (m = GUEST_RE.exec(text)); ) {
    const key = episodeKeyForName(m[1]);
    if (key && EPISODE_INDEX[key]?.slug && !out.includes(key)) out.push(key);
  }
  return out;
}
