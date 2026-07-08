export const revalidate = 21600;

const PODCAST_INDEX = "https://boundaryml.com/podcast";

interface EpisodeLinks {
  slug: string;
  showNotesUrl: string;
  codeUrl: string | null;
  episodeNumber: string | null;
}

let cache: { at: number; byYtId: Map<string, EpisodeLinks> } | null = null;
const CACHE_MS = 6 * 60 * 60 * 1000;

/**
 * Official episode links, keyed by YouTube id. boundaryml.com/podcast is
 * generated from the ai-that-works repo and embeds a JSON dataset per
 * episode (slug, codeUrl, youtubeUrl, episodeNumber) — one fetch maps
 * every video to its show-notes page and session source code.
 */
async function buildMap(): Promise<Map<string, EpisodeLinks>> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.byYtId;

  const byYtId = new Map<string, EpisodeLinks>();
  try {
    const res = await fetch(PODCAST_INDEX, {
      headers: { "User-Agent": "Mozilla/5.0 (aithatworks-portal)" },
      next: { revalidate: 21600 },
    });
    if (res.ok) {
      // The dataset is double-escaped inside an RSC payload string
      const html = (await res.text()).replace(/\\"/g, '"');
      const re =
        /"episodeNumber":"([^"]*)"[\s\S]{0,2000}?"codeUrl":"([^"]*)","youtubeUrl":"([^"]*)","slug":"([^"]+)"/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) !== null) {
        const [, episodeNumber, codeUrl, youtubeUrl, slug] = m;
        const yt = youtubeUrl.match(
          /(?:youtu\.be\/|watch\?v=|embed\/)([A-Za-z0-9_-]{11})/
        )?.[1];
        if (!yt) continue;
        byYtId.set(yt, {
          slug,
          showNotesUrl: `https://boundaryml.com/podcast/${slug}`,
          codeUrl: codeUrl || null,
          episodeNumber: episodeNumber || null,
        });
      }
    }
  } catch {
    // keep whatever we had
    if (cache) return cache.byYtId;
  }
  if (byYtId.size > 0) cache = { at: Date.now(), byYtId };
  return byYtId;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yt = searchParams.get("yt");
  if (!yt || !/^[A-Za-z0-9_-]{11}$/.test(yt)) {
    return Response.json({ episode: null });
  }
  const map = await buildMap();
  return Response.json({ episode: map.get(yt) ?? null });
}
