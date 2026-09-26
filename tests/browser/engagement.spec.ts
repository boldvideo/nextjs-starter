import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { player, preparePlayer } from "@/tests/browser/player-mocks";

const videoId = "11111111-1111-4111-8111-111111111111";
const rows = async (request: APIRequestContext, name = "events"): Promise<Record<string, unknown>[]> =>
  (await request.get(`http://127.0.0.1:4311/test/${name}`)).json();
const engagement = async (request: APIRequestContext) => (await rows(request)).filter(row => row.n === "source_open" || row.n === "video_progress");
const emit = async (page: Page, event: string) => player(page).evaluate((element, name) => element.dispatchEvent(new Event(name)), event);

test.beforeEach(async ({ request }) => {
  await request.delete("http://127.0.0.1:4311/test/events");
  await request.delete("http://127.0.0.1:4311/test/chats");
});

test("event proxy uses the tenant token, strips untrusted viewer, validates IDs and counters", async ({ request }) => {
  const data = { n: "source_open", interaction_id: crypto.randomUUID(), playback_id: crypto.randomUUID(), vid: videoId, viewer: "forged", watched_seconds: 900 };
  expect((await request.post("/event", { data })).ok()).toBe(true);
  expect(await rows(request)).toEqual([{ n: data.n, interaction_id: data.interaction_id, playback_id: data.playback_id, vid: videoId, trustedTenant: true }]);
  for (const fields of [{ playback_id: "mux-id" }, { interaction_id: "bad" }, { n: "video_progress", watched_seconds: -1 }, { n: "video_progress", watched_seconds: "5" }]) {
    expect((await request.post("/event", { data: { ...data, ...fields } })).status()).toBe(400);
  }
  expect(await rows(request)).toHaveLength(1);
});

test("ordinary playback is unattributed; explicit URLs survive redirect and count wall time without seek/pause inflation", async ({ page, request }) => {
  await page.goto("/v/voice-demo");
  await preparePlayer(page);
  await emit(page, "playing");
  await emit(page, "pause");
  expect(await engagement(request)).toHaveLength(0);
  const id = crypto.randomUUID();
  await page.goto(`/v/${videoId}?t=83&interaction_id=${id}`);
  await expect(page).toHaveURL(`/v/voice-demo?t=83&interaction_id=${id}`);
  await preparePlayer(page);
  await expect.poll(async () => (await engagement(request)).length).toBe(1);
  const open = (await engagement(request))[0];
  expect(open).toMatchObject({ n: "source_open", interaction_id: id, vid: videoId, trustedTenant: true });
  expect(open.playback_id).not.toBe("voice-demo");
  await player(page).evaluate(player => {
    Object.defineProperties(player, { readyState: { get: () => 4 }, seeking: { get: () => false } });
    (player as unknown as HTMLVideoElement).play();
  });
  await emit(page, "playing");
  await page.waitForTimeout(250);
  await emit(page, "seeking");
  await player(page).evaluate(player => { (player as unknown as HTMLVideoElement).currentTime = 300; });
  await page.waitForTimeout(400);
  await emit(page, "seeked"); // Buffered seek: no new playing event.
  await page.waitForTimeout(250);
  await emit(page, "waiting");
  await page.waitForTimeout(400);
  await emit(page, "pause");
  await expect.poll(async () => (await engagement(request)).filter(row => row.n === "video_progress").length).toBeGreaterThan(0);
  const progress = (await engagement(request)).filter(row => row.n === "video_progress");
  expect(progress.at(-1)?.watched_seconds).toBeGreaterThan(0.4);
  expect(progress.at(-1)?.watched_seconds).toBeLessThan(1.1);
  expect(progress.every(row => row.playback_id === open.playback_id)).toBe(true);
  await player(page).evaluate(player => (player as unknown as HTMLVideoElement).pause());
  await emit(page, "seeking");
  await emit(page, "seeked");
  await page.waitForTimeout(400);
  await emit(page, "pause");
  expect((await engagement(request)).filter(row => row.n === "video_progress")).toEqual(progress);
  // A different timestamp navigation is a deliberate new open, not more time on the previous one.
  await page.evaluate(() => {
    const url = new URL(location.href);
    url.searchParams.set("t", "120");
    history.pushState(null, "", url);
  });
  await expect.poll(async () => (await engagement(request)).filter(row => row.n === "source_open").length).toBe(2);
  const next = (await engagement(request)).filter(row => row.n === "source_open")[1];
  expect(next.interaction_id).toBe(id);
  expect(next.playback_id).not.toBe(open.playback_id);
});

test("preview timestamp opened in a new tab settles only at destination and opens that interaction", async ({ page, request, context }) => {
  await request.delete("http://127.0.0.1:4311/test/searches");
  await page.goto("/s");
  await page.keyboard.press("Control+k");
  await page.getByPlaceholder("Search videos, transcripts...").fill("pricing");
  const link = page.getByRole("link", { name: /Pricing moment/ });
  await expect(link).toBeVisible();
  const popupPromise = context.waitForEvent("page");
  await link.click({ modifiers: ["Control"] });
  const popup = await popupPromise;
  await expect.poll(async () => (await engagement(request)).length).toBe(1);
  const searches = await rows(request, "searches");
  expect(searches.map(row => row.search_mode)).toEqual(["preview", "settled"]);
  expect(new URL(popup.url()).searchParams.get("t")).toBe("83");
  expect(new URL(popup.url()).searchParams.get("search_request_id")).toBe(searches[1].request_id);
  await popup.close();
});

test("Ask keeps an older answer's explicit source ID after a newer answer and retains pending opens", async ({ page, request }) => {
  await page.goto("/ask?q=first");
  const citation = page.getByRole("button", { name: /Source 1:/ }).first();
  await expect(citation).toBeVisible();
  await expect.poll(async () => (await rows(request, "chats")).length).toBe(1);
  expect((await rows(request, "chats"))[0]).toMatchObject({ channel: "portal", client_name: "nextjs-starter" });
  const first = (await rows(request, "chats"))[0].interactionId;
  const input = page.locator("textarea").filter({ visible: true });
  await expect(input).toBeEnabled();
  await input.fill("pending");
  await input.press("Enter");
  await expect(page.getByRole("button", { name: /Source 1:/ })).toHaveCount(2);
  await page.getByRole("button", { name: /Source 1:/ }).last().click();
  await preparePlayer(page);
  await emit(page, "playing");
  await page.waitForTimeout(200);
  await emit(page, "pause");
  await expect.poll(async () => (await engagement(request)).filter(row => row.n === "source_open").length).toBe(1);
  const second = (await rows(request, "chats"))[1].interactionId;
  expect((await engagement(request))[0].interaction_id).toBe(second);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await citation.click();
  await expect.poll(async () => (await engagement(request)).filter(row => row.n === "source_open").length).toBe(2);
  const opens = (await engagement(request)).filter(row => row.n === "source_open");
  expect(opens[1].interaction_id).toBe(first);
  expect(opens[1].playback_id).not.toBe(opens[0].playback_id);
  if (process.env.REVIEW_SCREENSHOT) await page.screenshot({ path: process.env.REVIEW_SCREENSHOT });
});

test("episode links retain pending and older answer attribution in new tabs", async ({ page, request, context }) => {
  await page.goto("/ask?q=mentions");
  const episode = page.getByRole("link", { name: /^Episode 8/ });
  await expect(episode.first()).toHaveAttribute("href", /interaction_id=/);
  const first = (await rows(request, "chats"))[0].interactionId;
  const input = page.locator("textarea").filter({ visible: true });
  await input.fill("mentions-pending");
  await input.press("Enter");
  await expect(episode).toHaveCount(2);
  await expect(episode.last()).toHaveAttribute("href", /answer_request_id=/);
  const pendingPopup = context.waitForEvent("page");
  await episode.last().click({ modifiers: ["Control"] });
  const pending = await pendingPopup;
  await expect.poll(async () => (await engagement(request)).length).toBe(1);
  expect((await engagement(request))[0].interaction_id).toBe((await rows(request, "chats"))[1].interactionId);
  await pending.close();
  await expect(episode.first()).toHaveAttribute("href", new RegExp(`interaction_id=${first}`));
  const oldPopup = context.waitForEvent("page");
  await episode.first().click({ modifiers: ["Control"] });
  const old = await oldPopup;
  await expect.poll(async () => (await engagement(request)).length).toBe(2);
  expect((await engagement(request))[1].interaction_id).toBe(first);
  await old.close();
});

test("a new-tab source retains pending completion independently of the inline player", async ({ page, request, context }) => {
  await page.goto("/ask?q=pending");
  await page.getByRole("button", { name: /Source 1:/ }).first().click();
  const link = page.getByRole("link", { name: /full video/i });
  await expect(link).toHaveAttribute("href", /answer_request_id=/);
  const popupPromise = context.waitForEvent("page");
  await link.click({ modifiers: ["Control"] });
  const popup = await popupPromise;
  await expect.poll(async () => (await engagement(request)).filter(row => row.n === "source_open").length).toBe(2);
  const opens = (await engagement(request)).filter(row => row.n === "source_open");
  expect(opens[0].interaction_id).toBe(opens[1].interaction_id);
  expect(opens[0].playback_id).not.toBe(opens[1].playback_id);
  await popup.close();
});

test("video chat timestamp uses its answer interaction; missing ID never emits engagement", async ({ page, request }) => {
  await page.goto("/v/voice-demo");
  await preparePlayer(page);
  const input = page.getByPlaceholder("Ask me something about this video...").filter({ visible: true });
  await input.fill("first");
  await input.press("Enter");
  const timestamp = page.getByRole("button", { name: /01:23/ }).filter({ visible: true });
  await expect(timestamp).toBeVisible();
  await timestamp.click();
  await expect.poll(async () => (await engagement(request)).length).toBe(1);
  expect((await rows(request, "chats"))[0]).toMatchObject({ channel: "portal", client_name: "nextjs-starter" });
  expect((await engagement(request))[0].interaction_id).toBe((await rows(request, "chats"))[0].interactionId);
  await input.fill("no-id");
  await input.press("Enter");
  await expect(timestamp).toHaveCount(2);
  await timestamp.last().click();
  await emit(page, "playing");
  await emit(page, "pause");
  await page.waitForTimeout(300);
  expect((await engagement(request)).filter(row => row.n === "source_open")).toHaveLength(1);
});

test("early EOF settles an unanswered interaction as null instead of leaving a pending handoff", async ({ page, request }) => {
  await page.route("**/api/ai-ask", route => route.fulfill({
    contentType: "text/event-stream",
    body: 'data: {"type":"text_delta","delta":"Partial answer"}\n\n',
  }));
  await page.goto("/ask?q=early-eof");
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage)
    .filter(key => key.startsWith("bold:interaction:"))
    .map(key => JSON.parse(localStorage.getItem(key)!).id))).toEqual([null]);
  expect(await engagement(request)).toHaveLength(0);
});

test("all AI proxies forward portal metadata and completion IDs through the published SDK", async ({ request }) => {
  for (const [path, data] of [
    ["/api/ai-ask", { prompt: "test", channel: "mcp", viewer: "forged" }],
    ["/api/coach", { message: "test" }],
    ["/api/ask", { question: "test", videoId, subdomain: "" }],
  ] as const) {
    const response = await request.post(path, { data });
    expect(response.ok()).toBe(true);
    const text = await response.text();
    const chat = (await rows(request, "chats")).at(-1)!;
    expect(chat).toMatchObject({ channel: "portal", client_name: "nextjs-starter" });
    expect(chat.viewer).toBeUndefined();
    expect(text).toContain(`"interactionId":"${chat.interactionId}"`);
  }
  const response = await request.post("/api/ai-search", { data: { prompt: "test", request_id: crypto.randomUUID(), stream: false } });
  expect(response.ok()).toBe(true);
  expect((await rows(request, "ai-searches")).at(-1)).toMatchObject({ channel: "portal", client_name: "nextjs-starter" });
});
