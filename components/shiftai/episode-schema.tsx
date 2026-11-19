import type { Video } from "@boldvideo/bold-js";
import type { EpisodeContent, Person } from "@/lib/shiftai/episode";
import type { Chapter, Paragraph } from "@/lib/shiftai/episode-data";

// JSON-LD for an episode page: a VideoObject (the YouTube video, credited to
// the channel) that is also a PodcastEpisode of The AI Revolution Show, with one Clip
// per chapter, a SeekToAction for deep links and the people. The transcript is
// already server-rendered in the page, so it is not repeated here (page weight).
export function EpisodeSchema({
  video,
  episode,
  chapters,
  url,
}: {
  video: Video;
  episode: EpisodeContent | null;
  chapters: Chapter[];
  paragraphs: Paragraph[];
  url: string;
}) {
  const person = (p: Person) => ({
    "@type": "Person",
    name: p.name,
    ...(p.companyUrl && { url: p.companyUrl }),
    ...(p.company && { affiliation: { "@type": "Organization", name: p.company } }),
  });
  const youtube = episode?.youtubeId ? `https://www.youtube.com/watch?v=${episode.youtubeId}` : undefined;

  const schema = {
    "@context": "https://schema.org",
    "@type": ["VideoObject", "PodcastEpisode"],
    "@id": url,
    url,
    name: episode ? `Episode ${episode.number}: ${episode.title}` : video.title,
    description: episode?.hook || video.description || video.title,
    thumbnailUrl: video.thumbnail,
    uploadDate: video.publishedAt,
    datePublished: episode?.date ?? video.publishedAt,
    duration: iso(video.duration),
    ...(episode?.number && { episodeNumber: episode.number }),
    ...(youtube && { sameAs: [youtube] }),
    partOfSeries: { "@type": "PodcastSeries", name: "The AI Revolution Show", url: "https://www.shiftai.events/podcast" },
    ...(episode?.host && { author: person(episode.host), creator: person(episode.host) }),
    ...(episode && {
      actor: [person(episode.guest)],
      about: episode.guest.company,
    }),
    hasPart: chapters.map((c) => ({
      "@type": "Clip",
      name: c.title,
      startOffset: Math.floor(c.start),
      endOffset: Math.floor(c.end),
      url: `${url}?t=${Math.floor(c.start)}`,
    })),
    potentialAction: {
      "@type": "SeekToAction",
      target: `${url}?t={seek_to_second_number}`,
      "startOffset-input": "required name=seek_to_second_number",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}
    />
  );
}

function iso(seconds?: number) {
  if (!seconds || seconds <= 0) return "PT0S";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}${s ? `${s}S` : ""}`;
}
