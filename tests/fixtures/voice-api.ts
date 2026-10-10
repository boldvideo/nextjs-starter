import { createServer } from "node:http";
import { generateKeyPairSync, sign } from "node:crypto";

const port = Number(process.env.VOICE_FIXTURE_PORT || 4311);
const video = {
  id: "11111111-1111-4111-8111-111111111111", slug: "voice-demo",
  title: "Make room for your best work", description: "Small changes to how you plan your day can make a big difference. Explore the lesson, then ask your assistant about the moments that matter to you.",
  duration: 320, playback_id: "voice-demo", thumbnail: "/og-static.png",
  transcript: { json: { url: `http://127.0.0.1:${port}/transcript` } },
};
const nextVideo = { ...video, id: "22222222-2222-4222-8222-222222222222", slug: "voice-next", title: "Build a daily rhythm" };
// Disposable test credentials: these keys are never saved or trusted by Mux.
const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const fixtureToken = (aud: string) => {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: "fixture" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: "signed-demo", aud, exp: Math.floor(Date.now() / 1000) + 43200 })).toString("base64url");
  const input = `${header}.${payload}`;
  return `${input}.${sign("RSA-SHA256", Buffer.from(input), privateKey).toString("base64url")}`;
};
const playbackToken = fixtureToken("v");
const storyboardToken = fixtureToken("s");
const signedVideo = { ...video, id: "33333333-3333-4333-8333-333333333333", slug: "signed-demo",
  playback_id: "signed-demo", playback_policy: "signed", playback_token: playbackToken,
  storyboard_token: storyboardToken, thumbnail: "/og-static.png" };
const signedStreamVideo = { ...signedVideo, slug: "signed-demo-stream",
  stream_url: `https://stream.mux.com/signed-demo.m3u8?token=${playbackToken}&provided=1` };
const signedSource = { id: "c_signed", video_id: signedVideo.id, title: signedVideo.title,
  timestamp: 83, timestamp_end: 95, text: "Signed source", playback_id: signedVideo.playback_id,
  playback_policy: "signed", playback_token: playbackToken, storyboard_token: storyboardToken,
  thumbnail: signedVideo.thumbnail };
const settings = {
  name: "Bold Learning", slug: "voice-test", logo_url: "/bold-logo.svg",
  account: { id: "voice-test", name: "Bold Learning", subdomain: "voice-test", ai: {
    enabled: true, name: "Your assistant", avatar_url: "/favicon.png",
    greeting: "Let's put this lesson into practice. Ask a question, or talk it through with me.",
  } },
  portal: { layout: { type: "library" }, navigation: { show_header: true }, color_scheme: "toggle" },
};
const searches: Record<string, string>[] = [];
const aiSearches: Record<string, unknown>[] = [];
const events: Record<string, unknown>[] = [];
const chats: Record<string, unknown>[] = [];
let settingsRequests = 0;
const interactions = new Map<string, string>();
createServer((request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "*");
  response.setHeader("Content-Type", "application/json");
  if (request.method === "OPTIONS") { response.end(); return; }
  const path = request.url ?? "";
  const url = new URL(path, "http://localhost");
  if (url.pathname === "/api/v1/ai/chat/signed-history") {
    response.end(JSON.stringify({ conversation_id: "signed-history", messages: [{
      id: "signed-question", role: "user", content: "Show me the signed lesson", inserted_at: new Date(Date.now() - 1000).toISOString(),
    }, {
      id: "signed-answer", role: "assistant", content: "Watch [1].", sources: [signedSource], inserted_at: new Date().toISOString(),
    }] }));
    return;
  }
  if (url.pathname === "/test/settings-requests") {
    if (request.method === "DELETE") settingsRequests = 0;
    response.end(JSON.stringify(settingsRequests));
    return;
  }
  if (url.pathname === "/test/events" || url.pathname === "/test/chats") {
    const rows = url.pathname === "/test/events" ? events : chats;
    if (request.method === "DELETE") rows.length = 0;
    response.end(JSON.stringify(rows));
    return;
  }
  if (url.pathname === "/api/v1/event" || (url.pathname.includes("/ai/") && url.pathname.includes("/chat") && request.method === "POST")) {
    let body = "";
    request.on("data", chunk => { body += chunk; });
    request.on("end", () => {
      const input = JSON.parse(body);
      if (url.pathname === "/api/v1/event") {
        events.push({ ...input, trustedTenant: request.headers.authorization === process.env.EXPECTED_API_KEY });
        response.end("{}");
        return;
      }
      const interactionId = crypto.randomUUID();
      chats.push({ ...input, path: url.pathname, interactionId });
      const source = input.prompt?.includes("signed") ? {
        ...signedSource,
        ...(input.prompt.includes("no-poster") ? { thumbnail: null, storyboard_token: null } : {}),
      } : { id: "c_abc123", video_id: video.id, title: video.title, timestamp: 83, text: "Pricing source", playback_id: "voice-demo",
        ...(input.prompt === "public-poster" ? { thumbnail: video.thumbnail } : {}) };
      const content = input.prompt?.includes("mentions")
        ? `Watch [1]. **Episode 8 ("${video.title}")** and *${video.title}*.`
        : "Watch [1] and [01:23] for pricing.";
      response.setHeader("Content-Type", "text/event-stream");
      if (input.prompt?.includes("signed")) {
        response.write(`data: ${JSON.stringify({ type: "citation_map", citation_map: { c_signed: source } })}\n\n`);
      }
      response.write(`data: ${JSON.stringify({ type: "sources", sources: [source] })}\n\n`);
      response.write(`data: ${JSON.stringify({ type: "text_delta", delta: content })}\n\n`);
      setTimeout(() => response.end(`data: ${JSON.stringify({ type: "message_complete", content, citations: [source], interaction_id: input.prompt === "no-id" ? null : interactionId, response_type: "answer" })}\n\ndata: [DONE]\n\n`), input.prompt?.includes("pending") ? 2500 : 0);
    });
    return;
  }
  if (url.pathname === "/test/ai-searches") {
    if (request.method === "DELETE") aiSearches.length = 0;
    response.end(JSON.stringify(aiSearches));
    return;
  }
  if (url.pathname === "/api/v1/ai/search") {
    let body = "";
    request.on("data", chunk => { body += chunk; });
    request.on("end", () => {
      const search = JSON.parse(body);
      aiSearches.push(search);
      const key = search.request_id || crypto.randomUUID();
      if (!interactions.has(key)) interactions.set(key, crypto.randomUUID());
      const result = { content: "Pricing answer", citations: search.prompt?.includes("signed") ? [signedSource] : [], response_type: "answer",
        interaction_id: search.search_mode === "preview" ? null : interactions.get(key) };
      if (search.stream === false) response.end(JSON.stringify(result));
      else {
        response.setHeader("Content-Type", "text/event-stream");
        if (result.citations.length) response.write(`data: ${JSON.stringify({ type: "sources", sources: result.citations })}\n\n`);
        response.end(`data: ${JSON.stringify({ type: "text_delta", delta: result.content })}\n\ndata: ${JSON.stringify({ type: "message_complete", ...result })}\n\ndata: [DONE]\n\n`);
      }
    });
    return;
  }
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
  if (path.includes("settings")) settingsRequests++;
  const data = path.includes("settings") ? settings
    : path.includes("/videos/") && !path.includes("/latest") ? (path.includes("signed-demo") ? {
      ...(path.includes("signed-demo-stream") ? signedStreamVideo : signedVideo),
      ...(path.includes("no-storyboard") ? { storyboard_token: null, slug: "signed-demo-no-storyboard" } : {}),
    } : path.includes(nextVideo.slug) || path.includes(nextVideo.id) ? nextVideo : video)
    : path.includes("/playlists/") ? { id: path.includes("signed-test") ? "signed-test" : "test",
      title: "Everyday focus", videos: path.includes("signed-test") ? [signedVideo, nextVideo] : [video, nextVideo] }
    : url.pathname === "/api/v1/videos" || path.includes("/videos/latest")
      ? Number(url.searchParams.get("page") || 1) === 1 ? [video, { ...signedVideo, title: "Signed episode" }] : []
    : [];
  response.end(JSON.stringify({ data }));
}).listen(port, "127.0.0.1");
