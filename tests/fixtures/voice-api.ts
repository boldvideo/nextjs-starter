import { createServer } from "node:http";

const video = {
  id: "11111111-1111-4111-8111-111111111111", slug: "voice-demo",
  title: "Make room for your best work", description: "Small changes to how you plan your day can make a big difference. Explore the lesson, then ask your assistant about the moments that matter to you.",
  duration: 320, playback_id: "voice-demo", thumbnail: "/og-static.png",
  transcript: { json: { url: "http://127.0.0.1:4311/transcript" } },
};
const nextVideo = { ...video, id: "22222222-2222-4222-8222-222222222222", slug: "voice-next", title: "Build a daily rhythm" };
const settings = {
  name: "Bold Learning", slug: "voice-test", logo_url: "/bold-logo.svg",
  account: { id: "voice-test", name: "Bold Learning", subdomain: "voice-test", ai: {
    enabled: true, name: "Your assistant", avatar_url: "/favicon.png",
    greeting: "Let's put this lesson into practice. Ask a question, or talk it through with me.",
  } },
  portal: { layout: { type: "library" }, navigation: { show_header: true }, color_scheme: "toggle" },
};
const searches: Record<string, string>[] = [];
const interactions = new Map<string, string>();
createServer((request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "*");
  response.setHeader("Content-Type", "application/json");
  if (request.method === "OPTIONS") { response.end(); return; }
  const path = request.url ?? "";
  const url = new URL(path, "http://localhost");
  if (url.pathname === "/test/searches") {
    if (request.method === "DELETE") searches.length = 0;
    response.end(JSON.stringify(searches));
    return;
  }
  if (url.pathname === "/api/v1/search") {
    const search = Object.fromEntries(url.searchParams);
    searches.push(search);
    const key = search.request_id || crypto.randomUUID();
    if (!interactions.has(key)) interactions.set(key, crypto.randomUUID());
    response.end(JSON.stringify({
      interaction_id: search.search_mode === "preview" ? null : interactions.get(key),
      hits: [{ internal_id: video.id, short_id: video.slug, title: `Result for ${search.query}`,
        thumbnail: null, duration: 320, segments: [{ start_time: 83, text: "Pricing moment" }] }],
    }));
    return;
  }
  const data = path.includes("settings") ? settings
    : path.includes("/videos/") && !path.includes("/latest") ? (path.includes(nextVideo.slug) || path.includes(nextVideo.id) ? nextVideo : video)
    : path.includes("/playlists/") ? { id: "test", title: "Everyday focus", videos: [video, nextVideo] }
    : [];
  response.end(JSON.stringify({ data }));
}).listen(4311, "127.0.0.1");
