import "server-only";

import { createClient } from "@sanity/client";

// Editorial layer for the A Smart Bear portal (Sanity project je17v8aj, public
// dataset). Bold stays the source of truth for video, transcript, chapters and
// AI; Sanity holds people, episode stories, frameworks, the book and copy.
export const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID ?? "je17v8aj",
  dataset: process.env.SANITY_DATASET ?? "production",
  apiVersion: "2025-02-19",
  useCdn: true,
});

const REVALIDATE = 60;

export async function sanityFetch<T>(query: string, params: Record<string, unknown> = {}): Promise<T | null> {
  try {
    return await sanity.fetch<T>(query, params, { next: { revalidate: REVALIDATE, tags: ["sanity"] } });
  } catch (error) {
    console.error("[sanity] fetch failed", error);
    return null;
  }
}

const personFields = `name, company, companyUrl, x, "slug": slug.current, "photo": photo.asset->url`;

export const HOME_QUERY = `{
  "site": *[_id == "siteSettings"][0],
  "book": *[_id == "book"][0]{ ..., "cover": cover.asset->url },
  "chapters": *[_type == "bookChapter"] | order(number asc){ number, title, promise },
  "talks": *[_type == "talk"] | order(order asc){ title, note, youtubeId },
  "episodes": *[_type == "episode"] | order(number desc){
    number, title, boldSlug, company, logline,
    "hotSeat": hotSeat[]->{ ${personFields} },
    "cohosts": cohosts[]->{ ${personFields} }
  }
}`;

export const EPISODE_QUERY = `*[_type == "episode" && boldSlug == $slug][0]{
  number, title, boldSlug, youtubeId, publishedAt, company, logline, crux, followUp,
  "host": host->{ ${personFields} },
  "hotSeat": hotSeat[]->{ ${personFields} },
  "cohosts": cohosts[]->{ ${personFields} },
  "moments": moments[]{ quote, at, "slug": slug.current, "speaker": speaker->{ ${personFields} } },
  "tools": tools[]->{ name, summary, articleUrl, "slug": slug.current, "chapter": chapter->{ number, title } },
  "next": *[_type == "episode" && number == ^.number + 1][0]{
    number, boldSlug, company, logline,
    "hotSeat": hotSeat[]->{ ${personFields} },
    "cohosts": cohosts[]->{ ${personFields} }
  }
}`;

export interface Person { name: string; company?: string; companyUrl?: string; x?: string; slug: string; photo?: string }
export interface Stamp { text?: string; quote?: string; at?: string }
export interface EpisodeSummary {
  number: number; title: string; boldSlug: string; company?: string; logline?: Stamp;
  hotSeat?: Person[]; cohosts?: Person[];
}
export interface HomeContent {
  site: Record<string, any> | null;
  book: Record<string, any> | null;
  chapters: { number: number; title: string; promise: string }[];
  talks: { title: string; note: string; youtubeId: string }[];
  episodes: EpisodeSummary[];
}
export interface EpisodeContent extends EpisodeSummary {
  youtubeId?: string; publishedAt?: string; followUp?: string;
  host?: Person;
  crux?: Record<"situation" | "diagnosis" | "options" | "landed", Stamp>;
  moments?: { quote: string; at?: string; slug?: string; speaker?: Person }[];
  tools?: { name: string; summary?: string; articleUrl?: string; slug?: string; chapter?: { number: number; title: string } }[];
  next?: EpisodeSummary | null;
}
