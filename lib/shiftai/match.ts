import { EPISODES, type ShowEpisode } from "./show";

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

interface VideoLike {
  id: string;
  slug?: string | null;
  title?: string | null;
}

/** Bold imports keep the YouTube title, so the title joins a Bold video to its episode. */
export function episodeForVideo(video: VideoLike): ShowEpisode | null {
  const title = norm(video.title ?? "");
  if (!title) return null;
  const exact = EPISODES.find((e) => norm(e.title) === title);
  if (exact) return exact;
  // Titles get edited; fall back to the guest's name, then the company.
  const byGuest = EPISODES.filter((e) => title.includes(norm(e.guest.name)));
  if (byGuest.length === 1) return byGuest[0];
  const byCompany = EPISODES.filter((e) => title.split(" ").includes(norm(e.guest.company).split(" ")[0]));
  return byCompany.length === 1 ? byCompany[0] : null;
}

export interface EpisodeLink {
  slug: string;
  id: string;
  thumbnail?: string | null;
}

/** youtubeId -> where that episode lives in Bold. Episodes not imported yet are absent. */
export function episodeLinks(videos: (VideoLike & { thumbnail?: string | null })[] | null | undefined): Record<string, EpisodeLink> {
  const out: Record<string, EpisodeLink> = {};
  for (const v of videos ?? []) {
    const ep = episodeForVideo(v);
    if (ep && !out[ep.youtubeId]) out[ep.youtubeId] = { slug: v.slug || v.id, id: v.id, thumbnail: v.thumbnail };
  }
  return out;
}
