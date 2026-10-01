import type { Metadata } from "next";

/**
 * The GTM Game share metadata. Next merges metadata shallowly per key, so a page
 * that sets `openGraph` replaces the layout's whole object — every page goes
 * through this to always emit the full OG + Twitter set (site name, type,
 * url, sized image with alt, large-image card).
 */

export const GYM_SITE_NAME = "The GTM Game";
/** The public host printed on share cards and the strategy guide (not the
 *  request host, so previews and localhost never leak onto a card). */
export const GYM_PUBLIC_HOST = "play.founderwell.com";
export const GYM_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || `https://${GYM_PUBLIC_HOST}`;
export const GYM_DEFAULT_TITLE = "The GTM Game — by FounderWell";
export const GYM_DEFAULT_DESCRIPTION =
  "Answers from real GTM coaches, not generic AI. Ask anything about going to market — positioning, outbound, demos, pricing — and get a game plan with the exact minute of a FounderWell coaching session that backs it up. Free.";
// Bump ?v= when the card changes; crawlers cache by URL
export const GYM_HOME_IMAGE = "/gym/og-home.jpg?v=5";

interface GymMetaInput {
  /** Page title (the layout template appends " · The GTM Game") */
  title?: string;
  /** Title for share cards — defaults to title */
  shareTitle?: string;
  description?: string;
  /** Canonical path; omitted in the layout so pages don't inherit "/" */
  path?: string;
  image?: string;
  imageAlt?: string;
  type?: "website" | "article" | "video.other";
}

export function gymMeta({
  title,
  shareTitle,
  description = GYM_DEFAULT_DESCRIPTION,
  path,
  image = GYM_HOME_IMAGE,
  imageAlt = "The GTM Game by FounderWell: answers from real GTM coaches, not generic AI, with the exact minute of video that backs them up.",
  type = "website",
}: GymMetaInput = {}): Metadata {
  const ogTitle = shareTitle || title || GYM_DEFAULT_TITLE;
  const images = [{ url: image, width: 1200, height: 630, alt: imageAlt }];

  return {
    ...(title ? { title } : {}),
    description,
    ...(path ? { alternates: { canonical: path } } : {}),
    openGraph: {
      type,
      siteName: GYM_SITE_NAME,
      locale: "en_US",
      url: path || "/",
      title: ogTitle,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images,
    },
  };
}

/** Plain-text teaser from an AI answer: no citation refs, no markdown. */
export function answerTeaser(content: string | undefined, max = 180): string | undefined {
  if (!content) return undefined;
  const text = content
    .replace(/\[(?:\d+|c_[^\]]+)\](\([^)]*\))?/g, "")
    .replace(/[*_`>#]+/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return undefined;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Session pages: the "INSTANT REPLAY" card, optionally at the shared timestamp. */
export function gymVideoMeta(
  video: { id: string; title: string; slug?: string | null; teaser?: string | null; description?: string | null },
  canonicalPath: string,
  startSeconds?: number
): Metadata {
  const t = startSeconds && startSeconds > 0 ? Math.floor(startSeconds) : 0;
  return gymMeta({
    title: video.title,
    shareTitle: `${video.title} — The GTM Game`,
    description:
      answerTeaser(video.teaser || video.description || undefined, 200) ||
      "A FounderWell training session in The GTM Game.",
    path: canonicalPath,
    image: `/og?v=${encodeURIComponent(video.id)}${t ? `&t=${t}` : ""}`,
    imageAlt: `The GTM Game: ${video.title}`,
    type: "video.other",
  });
}
