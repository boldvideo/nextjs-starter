export const revalidate = 3600;

const LUMA_CALENDAR = "https://luma.com/baml";
const PODCAST_INDEX = "https://boundaryml.com/podcast";

interface NextEvent {
  name: string;
  startAt: string;
  url: string;
}

function fetchOpts() {
  return {
    headers: { "User-Agent": "Mozilla/5.0 (aithatworks-portal)" },
    next: { revalidate: 3600 },
  };
}

/** Events from the Luma calendar page's __NEXT_DATA__. */
async function lumaEvents(): Promise<(NextEvent & { slug: string })[]> {
  try {
    const res = await fetch(LUMA_CALENDAR, fetchOpts());
    if (!res.ok) return [];
    const html = await res.text();
    const match = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
    );
    if (!match) return [];
    const events: (NextEvent & { slug: string })[] = [];
    const walk = (o: unknown) => {
      if (Array.isArray(o)) {
        o.forEach(walk);
        return;
      }
      if (o && typeof o === "object") {
        const rec = o as Record<string, unknown>;
        if (
          typeof rec.start_at === "string" &&
          typeof rec.name === "string" &&
          typeof rec.url === "string" &&
          rec.name
        ) {
          events.push({
            name: rec.name,
            startAt: rec.start_at,
            url: `https://luma.com/${rec.url}`,
            slug: rec.url as string,
          });
        }
        Object.values(rec).forEach(walk);
      }
    };
    walk(JSON.parse(match[1]));
    return events;
  } catch {
    return [];
  }
}

/**
 * Future sessions from the show's podcast index (auto-generated from the
 * ai-that-works repo) — when present these carry the actual topic and the
 * session's own RSVP link.
 */
async function podcastUpcoming(): Promise<NextEvent[]> {
  try {
    const res = await fetch(PODCAST_INDEX, fetchOpts());
    if (!res.ok) return [];
    const html = (await res.text()).replace(/\\"/g, '"');
    const events: NextEvent[] = [];
    const chunks = html.split('{"id":');
    for (const c of chunks.slice(1)) {
      const date = c.match(/"date":"([^"]+)"/)?.[1];
      const title = c.match(/"title":"((?:[^"\\]|\\.)*)"/)?.[1];
      const rsvp = c.match(/"rsvpUrl":"([^"]*)"/)?.[1];
      const ep = c.match(/"episodeNumber":"([^"]*)"/)?.[1];
      if (!date || !title) continue;
      if (Date.parse(date) <= Date.now()) continue;
      events.push({
        name: ep ? `EP ${ep} · ${title}` : title,
        startAt: date,
        url: rsvp || LUMA_CALENDAR,
      });
    }
    return events;
  } catch {
    return [];
  }
}

/**
 * The next show session, merged from two sources:
 * 1. Podcast-index future entries (authoritative topic + RSVP link)
 * 2. Luma calendar — preferring aitw-* slugs (actual show sessions) over
 *    other events on the shared calendar
 * The client falls back to the weekly cadence when this returns nothing.
 */
export async function GET() {
  const [podcast, luma] = await Promise.all([podcastUpcoming(), lumaEvents()]);
  const now = Date.now();
  const byStart = (a: NextEvent, b: NextEvent) =>
    Date.parse(a.startAt) - Date.parse(b.startAt);

  const podcastNext = podcast.sort(byStart)[0] ?? null;
  const lumaFuture = luma.filter((e) => Date.parse(e.startAt) > now);
  const lumaShow = lumaFuture
    .filter((e) => e.slug.startsWith("aitw-"))
    .sort(byStart)[0];
  const lumaAny = lumaFuture.sort(byStart)[0];

  const event = podcastNext ?? lumaShow ?? lumaAny ?? null;
  return Response.json({ event });
}
