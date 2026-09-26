import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const recorded = async (request: APIRequestContext): Promise<Record<string, string>[]> => {
  const rows: Record<string, string>[] = await (await request.get("http://127.0.0.1:4311/test/searches")).json();
  return rows.map(row => {
    expect(row.channel).toBe("portal");
    expect(row.client_name).toBe("nextjs-starter");
    const search = { ...row };
    delete search.channel;
    delete search.client_name;
    return search;
  });
};

async function preview(page: Page) {
  await page.keyboard.press("Control+k");
  const input = page.getByPlaceholder("Search videos, transcripts...");
  await expect(input).toBeVisible();
  for (const query of ["pri", "pric", "pricing"]) {
    await input.fill(query);
    await page.waitForTimeout(400);
    await expect(page.getByRole("heading", { name: `Result for ${query}`, exact: true })).toBeVisible();
  }
  return input;
}

test.beforeEach(async ({ request }) => {
  await request.delete("http://127.0.0.1:4311/test/searches");
});

for (const action of ["Enter", "See all", "title", "thumbnail", "timestamp"]) {
  test(`paused typing previews only; ${action} settles once`, async ({ page, request }) => {
    await page.goto("/s");
    const input = await preview(page);
    expect(await recorded(request)).toEqual(["pri", "pric", "pricing"].map(query => ({ query, search_mode: "preview" })));
    if (action === "Enter") await input.press("Enter");
    else if (action === "See all") await page.getByRole("link", { name: /See all results/ }).click();
    else if (action === "title") await page.getByRole("link", { name: /Result for pricing/ }).click();
    else if (action === "timestamp") await page.getByRole("link", { name: /Pricing moment/ }).click();
    else await page.locator('a[href^="/v/voice-demo?"]').first().click();
    await expect.poll(async () => (await recorded(request)).filter(r => r.search_mode === "settled").length).toBe(1);
    await page.waitForTimeout(500);
    const searches = await recorded(request);
    expect(searches).toHaveLength(4);
    expect(searches[3]).toEqual({ query: "pricing", search_mode: "settled", request_id: expect.stringMatching(uuid) });
    if (action === "Enter" || action === "See all") {
      expect(new URL(page.url()).searchParams.get("request_id")).toBe(searches[3].request_id);
      await expect(page.getByText('1 match for “pricing”')).toBeVisible();
      // Another explicit action for the same text must not reuse the earlier ID.
      await page.keyboard.press("Control+k");
      await input.fill("pricing");
      await input.press("Enter");
      await expect.poll(async () => (await recorded(request)).filter(r => r.search_mode === "settled").length).toBe(2);
      const settled = (await recorded(request)).filter(r => r.search_mode === "settled");
      expect(settled[1].request_id).not.toBe(settled[0].request_id);
    } else {
      await expect(page).toHaveURL(/\/v\/voice-demo\?/);
      expect(new URL(page.url()).searchParams.get("search_request_id")).toBe(searches[3].request_id);
      if (action === "timestamp") expect(new URL(page.url()).searchParams.get("t")).toBe("83");
    }
  });
}

test("direct visits install one ID; reload retries preserve it and new visits rotate it", async ({ page, request }) => {
  await page.goto("/s?q=pricing");
  await expect(page.getByText('1 match for “pricing”')).toBeVisible();
  const first = new URL(page.url()).searchParams.get("request_id");
  expect(first).toMatch(uuid);
  expect(await recorded(request)).toHaveLength(1);
  await page.reload();
  await expect(page.getByText('1 match for “pricing”')).toBeVisible();
  expect((await recorded(request)).map(r => r.request_id)).toEqual([first, first]);
  await page.goto("/s?q=pricing");
  await expect(page.getByText('1 match for “pricing”')).toBeVisible();
  expect(new URL(page.url()).searchParams.get("request_id")).not.toBe(first);
  expect(await recorded(request)).toHaveLength(3);
});

test("See all preserves new-tab navigation and pending previews never claim no results", async ({ page, request, context }) => {
  await page.goto("/s");
  await page.keyboard.press("Control+k");
  const input = page.getByPlaceholder("Search videos, transcripts...");
  await input.fill("pricing");
  await expect(page.getByText("Searching...", { exact: true })).toBeVisible();
  await expect(page.getByText(/No results found/)).toHaveCount(0);
  const link = page.getByRole("link", { name: /See all results/ });
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  const popupPromise = context.waitForEvent("page");
  await link.click({ modifiers: ["Control"] });
  const popup = await popupPromise;
  await expect(popup).toHaveURL(`http://localhost:4310${href}`);
  await expect(popup.getByText('1 match for “pricing”')).toBeVisible();
  expect((await recorded(request)).filter(r => r.search_mode === "settled")).toHaveLength(1);
  await popup.close();
});

test("late preview responses cannot replace current results or reopen a cleared modal", async ({ page }) => {
  // Deliberately ignore AbortSignal to exercise the stale-response guard, not only cancellation.
  await page.addInitScript(() => {
    const original = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      if (input === "/api/search" && typeof init?.body === "string") {
        const { query } = JSON.parse(init.body);
        if (query === "pri") {
          await new Promise(resolve => setTimeout(resolve, 1200));
          return new Response(JSON.stringify({ hits: [{ internal_id: "old", title: "Stale result" }] }));
        }
      }
      return original(input, init);
    };
  });
  await page.goto("/s");
  await page.keyboard.press("Control+k");
  const input = page.getByPlaceholder("Search videos, transcripts...");
  await input.fill("pri");
  await page.waitForTimeout(400);
  await input.fill("pricing");
  await expect(page.getByRole("heading", { name: "Result for pricing" })).toBeVisible();
  await page.waitForTimeout(1200);
  await expect(page.getByRole("heading", { name: "Stale result" })).toHaveCount(0);
  await input.fill("pri");
  await page.waitForTimeout(400);
  await input.press("Escape");
  await page.waitForTimeout(1200);
  await page.keyboard.press("Control+k");
  await expect(input).toHaveValue("");
  await expect(page.getByRole("heading", { name: "Stale result" })).toHaveCount(0);
});

test("real proxy validates and forwards GET/POST metadata and preserves interaction IDs", async ({ request }) => {
  const id = crypto.randomUUID();
  const preview = await request.post("/api/search", { data: { query: "pricing", search_mode: "preview", request_id: id } });
  expect(preview.ok()).toBe(true);
  expect((await preview.json()).interaction_id).toBeNull();
  const first = await request.get(`/api/search?q=pricing&search_mode=settled&request_id=${id}`);
  const retry = await request.post("/api/search", { data: { query: "pricing", request_id: id } });
  const interaction = (await first.json()).interaction_id;
  expect(interaction).toMatch(uuid);
  expect((await retry.json()).interaction_id).toBe(interaction);
  expect(await recorded(request)).toEqual([
    { query: "pricing", search_mode: "preview", request_id: id },
    { query: "pricing", search_mode: "settled", request_id: id },
    { query: "pricing", search_mode: "settled", request_id: id },
  ]);
  for (const data of [{ query: "x", search_mode: "invalid" }, { query: "x", request_id: "not-a-uuid" }, { query: 42 }, { query: "x", request_id: null }]) {
    expect((await request.post("/api/search", { data })).status()).toBe(400);
  }
  expect((await request.get("/api/search?q=x&search_mode=invalid")).status()).toBe(400);
  expect(await recorded(request)).toHaveLength(3);
});

test("AI proxy forwards action metadata through the published SDK and preserves SSE/JSON interactionId", async ({ request }) => {
  await request.delete("http://127.0.0.1:4311/test/ai-searches");
  const requestId = crypto.randomUUID();
  const complete = async (stream: boolean, search_mode: string, id = requestId) => {
    const response = await request.post("/api/ai-search", { data: { prompt: "pricing", request_id: id, search_mode, stream } });
    expect(response.ok()).toBe(true);
    if (!stream) return response.json();
    const events = (await response.text()).split("\n").filter(line => line.startsWith("data: {")).map(line => JSON.parse(line.slice(6)));
    return events.find(event => event.type === "message_complete");
  };
  expect((await complete(true, "preview")).interactionId).toBeNull();
  expect((await complete(false, "preview")).interactionId).toBeNull();
  const first = await complete(true, "settled");
  expect(first.interactionId).toMatch(uuid);
  expect((await complete(false, "settled")).interactionId).toBe(first.interactionId);
  expect((await complete(true, "settled", crypto.randomUUID())).interactionId).not.toBe(first.interactionId);
  const records = await (await request.get("http://127.0.0.1:4311/test/ai-searches")).json();
  expect(records.slice(0, 4)).toMatchObject([
    { prompt: "pricing", limit: 5, request_id: requestId, search_mode: "preview" },
    { prompt: "pricing", limit: 5, request_id: requestId, search_mode: "preview", stream: false },
    { prompt: "pricing", limit: 5, request_id: requestId, search_mode: "settled" },
    { prompt: "pricing", limit: 5, request_id: requestId, search_mode: "settled", stream: false },
  ]);
  for (const fields of [{ request_id: "bad" }, { search_mode: "bad" }]) {
    expect((await request.post("/api/ai-search", { data: { prompt: "pricing", ...fields } })).status()).toBe(400);
  }
});

test("AI explicit submits generate distinct IDs and retain completion IDs in browser result JSON", async ({ page, request }) => {
  await request.delete("http://127.0.0.1:4311/test/ai-searches");
  await page.goto("/playground");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const input = page.getByPlaceholder("Search your video library...");
  await input.fill("pricing");
  await page.waitForTimeout(400);
  expect(await (await request.get("http://127.0.0.1:4311/test/ai-searches")).json()).toHaveLength(0);
  for (let i = 0; i < 2; i++) {
    const responsePromise = page.waitForResponse(response => response.url().endsWith("/api/ai-search"));
    await page.getByRole("button", { name: "Submit", exact: true }).click();
    const response = await responsePromise;
    const events = (await response.text()).split("\n").filter(line => line.startsWith("data: {")).map(line => JSON.parse(line.slice(6)));
    const id = events.find(event => event.type === "message_complete").interactionId;
    expect(id).toMatch(uuid);
    await expect(page.getByRole("button", { name: "Submit", exact: true })).toBeEnabled();
    await expect(page.getByRole("treeitem", { name: `interactionId:"${id}"`, exact: true })).toBeVisible();
  }
  const records = await (await request.get("http://127.0.0.1:4311/test/ai-searches")).json();
  expect(records).toHaveLength(2);
  expect(records[0].request_id).toMatch(uuid);
  expect(records[1].request_id).toMatch(uuid);
  expect(records[0].request_id).not.toBe(records[1].request_id);
  expect(records.every((record: Record<string, unknown>) => record.search_mode === "settled")).toBe(true);
});
