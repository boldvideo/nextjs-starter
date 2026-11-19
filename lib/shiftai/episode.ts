import { EPISODES, HOST, type ShowEpisode } from "./show";
import { episodeForVideo, type EpisodeLink } from "./match";

export interface Person {
  name: string;
  slug: string;
  role?: string;
  company?: string;
  companyUrl?: string;
}

export interface Moment {
  title: string;
  summary?: string;
  quote?: string;
  start: number;
  end?: number;
  speaker?: string;
}

export interface EpisodeSummary {
  number: number;
  headline: string;
  hook: string;
  guest: Person;
  slug?: string;
}

export interface EpisodeContent extends EpisodeSummary {
  youtubeId: string;
  title: string;
  date: string;
  host: Person;
  chaptersFromFeed: boolean;
  next: EpisodeSummary | null;
  previous: EpisodeSummary | null;
}

const summary = (e: ShowEpisode, links: Record<string, EpisodeLink>): EpisodeSummary => ({
  number: e.number,
  headline: e.headline,
  hook: e.hook,
  guest: e.guest,
  slug: links[e.youtubeId]?.slug,
});

/** The show's own data for a Bold video: episode number, guest, hook, neighbours. */
export function episodeContent(
  video: { id: string; slug?: string | null; title?: string | null },
  links: Record<string, EpisodeLink>
): EpisodeContent | null {
  const e = episodeForVideo(video);
  if (!e) return null;
  // "Next" walks towards newer episodes and wraps to the first, so there is always somewhere to go.
  const live = EPISODES.filter((x) => links[x.youtubeId] && x.youtubeId !== e.youtubeId).sort((a, b) => a.number - b.number);
  const newer = live.find((x) => x.number > e.number) ?? live[0] ?? null;
  const older = [...live].reverse().find((x) => x.number < e.number) ?? null;
  return {
    ...summary(e, links),
    youtubeId: e.youtubeId,
    title: e.title,
    date: e.date,
    host: HOST,
    chaptersFromFeed: e.chaptersFromFeed,
    next: newer ? summary(newer, links) : null,
    previous: older ? summary(older, links) : null,
  };
}

/** The show's own YouTube chapters, as start/end ranges. */
export function showChapters(youtubeId: string, duration: number): { start: number; end: number; title: string }[] {
  const e = EPISODES.find((x) => x.youtubeId === youtubeId);
  if (!e) return [];
  return e.chapters.map((c, i) => ({ start: c.t, end: e.chapters[i + 1]?.t ?? duration, title: c.title }));
}
