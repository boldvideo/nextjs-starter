import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const recorded = async (request: APIRequestContext): Promise<Record<string, string>[]> =>
  (await request.get("http://127.0.0.1:4311/test/searches")).json();

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
    else if (action === "See all") await page.getByRole("button", { name: /See all results/ }).click();
    else if (action === "title") await page.getByRole("link", { name: /Result for pricing/ }).click();
    else if (action === "timestamp") await page.getByRole("link", { name: /Pricing moment/ }).click();
    else await page.locator('a[href="/v/voice-demo"]').first().click();
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
      await expect(page).toHaveURL(action === "timestamp" ? /\/v\/voice-demo\?t=83$/ : /\/v\/voice-demo$/);
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
