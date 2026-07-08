export const revalidate = 3600;

const LUMA_CALENDAR = "https://luma.com/baml";

interface LumaEvent {
  name: string;
  startAt: string;
  url: string;
}

/**
 * Next upcoming session from the show's Luma calendar. Luma embeds its
 * event data in the page's __NEXT_DATA__; we pick the earliest future
 * event. Cached for an hour; the client falls back to the known weekly
 * cadence when this returns nothing.
 */
export async function GET() {
  try {
    const res = await fetch(LUMA_CALENDAR, {
      headers: { "User-Agent": "Mozilla/5.0 (aithatworks-portal)" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return Response.json({ event: null });
    const html = await res.text();
    const match = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
    );
    if (!match) return Response.json({ event: null });

    const events: LumaEvent[] = [];
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
          });
        }
        Object.values(rec).forEach(walk);
      }
    };
    walk(JSON.parse(match[1]));

    const now = Date.now();
    const upcoming = events
      .filter((e) => Date.parse(e.startAt) > now)
      .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));

    return Response.json({ event: upcoming[0] ?? null });
  } catch {
    return Response.json({ event: null });
  }
}
