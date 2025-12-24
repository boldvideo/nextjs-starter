import type { Video } from "@boldvideo/bold-js";

interface VideoSchemaProps {
  video: Video;
  url: string;
}

/**
 * Generates JSON-LD structured data for a video page.
 * Implements schema.org VideoObject for better SEO and AI discoverability.
 */
export function VideoSchema({ video, url }: VideoSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: video.description || video.title,
    thumbnailUrl: video.thumbnail,
    uploadDate: video.publishedAt,
    duration: formatDurationISO8601(video.duration),
    contentUrl: url,
    embedUrl: `${url.replace("/v/", "/e/")}`,
    ...(video.transcript && { transcript: video.transcript.text }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * Converts duration in seconds to ISO 8601 format (PT#H#M#S)
 */
function formatDurationISO8601(seconds: number): string {
  if (!seconds || seconds <= 0) return "PT0S";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  let duration = "PT";
  if (hours > 0) duration += `${hours}H`;
  if (minutes > 0) duration += `${minutes}M`;
  if (secs > 0 || duration === "PT") duration += `${secs}S`;

  return duration;
}
