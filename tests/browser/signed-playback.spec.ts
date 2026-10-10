import { expect, test, type Page } from "@playwright/test";

const requests = new WeakMap<Page, { signed: boolean; public: boolean; unsigned: string[] }>();

test.beforeEach(async ({ page, request }) => {
  const fixture = await request.get("http://127.0.0.1:4311/api/v1/videos/signed-demo");
  const { data } = await fixture.json();
  const observed = { signed: false, public: false, unsigned: [] as string[] };
  requests.set(page, observed);
  page.on("request", request => {
    let url = new URL(request.url());
    if (url.pathname === "/_next/image") url = new URL(url.searchParams.get("url")!, page.url());
    if (!["stream.mux.com", "image.mux.com"].includes(url.hostname)) return;
    if (url.pathname.includes("signed-demo") && !url.searchParams.has("token")) observed.unsigned.push(url.hostname);
    if (url.hostname === "stream.mux.com") {
      if (url.pathname === "/signed-demo.m3u8") observed.signed = url.searchParams.get("token") === data.playback_token;
      if (url.pathname === "/voice-demo.m3u8") observed.public = !url.searchParams.has("token");
    }
  });
  // Hold mocked media manifests: tests cover real player request construction,
  // not Mux authorization. Never send disposable credentials to a live service.
  await page.route("https://stream.mux.com/**", () => {});
  await page.route("https://image.mux.com/**", route => route.fulfill({ contentType: "text/vtt", body: "WEBVTT\n\n" }));
  await page.addInitScript(() => {
    localStorage.setItem("theme", "light");
    const style = document.createElement("style");
    style.textContent = "nextjs-portal { display: none; }";
    document.addEventListener("DOMContentLoaded", () => document.head.append(style));
  });
});

// Return only booleans from credential checks so assertion failures never print JWTs or URLs.
const signedPlayer = async (page: Page, poster = "/og-static.png") => {
  await expect(page.locator("video")).toBeVisible();
  await expect.poll(() => requests.get(page)?.signed).toBe(true);
  if (poster) await expect(page.locator("img[data-visible]")).toHaveAttribute("src", poster);
  else await expect(page.locator("img[data-visible][src]")).toHaveCount(0);
  expect(requests.get(page)?.unsigned).toEqual([]);
};

for (const path of ["/v/signed-demo", "/e/signed-demo", "/e/signed-demo?chat=1", "/pl/signed-test/v/signed-demo"]) {
  test(`signed credentials and poster reach ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(path);
    await signedPlayer(page);
    if (path === "/v/signed-demo") {
      expect(await page.locator('meta[property="og:image"]').evaluate(element =>
        new URL(element.getAttribute("content")!, location.href).searchParams.get("img") === "/og-static.png")).toBe(true);
      if (process.env.PLAYBACK_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.PLAYBACK_SCREENSHOT_DIR}/signed-desktop-after.png` });
    }
  });
}

test("signed video without credentials retains the poster without requesting a stream", async ({ page }) => {
  let streams = 0;
  page.on("request", request => {
    if (new URL(request.url()).hostname === "stream.mux.com") streams++;
  });
  await page.goto("/v/signed-demo-no-token");
  await expect(page.locator("video")).toBeVisible();
  await expect(page.locator("img[data-visible]")).toHaveAttribute("src", "/og-static.png");
  await page.getByRole("button", { name: /play/i, exact: true }).first().click();
  await page.waitForTimeout(500);
  expect(streams).toBe(0);
  expect(requests.get(page)?.unsigned).toEqual([]);
});

test("signed video without storyboard and mobile video preserve the API poster", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/v/signed-demo-no-storyboard");
  await signedPlayer(page);
  if (process.env.PLAYBACK_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.PLAYBACK_SCREENSHOT_DIR}/signed-mobile-after.png` });
});

test("public player and OG URLs are unchanged", async ({ page }) => {
  await page.goto("/v/voice-demo");
  await expect(page.locator("video")).toBeVisible();
  await expect.poll(() => requests.get(page)?.public).toBe(true);
  await expect(page.locator("img[data-visible]")).toHaveAttribute("src", "/og-static.png");
  expect(await page.locator('meta[property="og:image"]').evaluate(element =>
    new URL(element.getAttribute("content")!, location.href).searchParams.get("img") ===
    "https://image.mux.com/voice-demo/thumbnail.jpg?width=1120&fit_mode=preserve")).toBe(true);
  if (process.env.PLAYBACK_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.PLAYBACK_SCREENSHOT_DIR}/public-desktop-after.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  if (process.env.PLAYBACK_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.PLAYBACK_SCREENSHOT_DIR}/public-mobile-after.png` });
});

for (const mobile of [false, true]) {
  test(`signed Ask citation receives credentials on ${mobile ? "mobile" : "desktop"}`, async ({ page }) => {
    await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 800 });
    await page.goto("/ask?q=signed");
    await page.getByRole("button", { name: /Source 1:/ }).first().click();
    await signedPlayer(page);
    if (process.env.PLAYBACK_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.PLAYBACK_SCREENSHOT_DIR}/citation-${mobile ? "mobile" : "desktop"}-after.png` });
  });
}

test("signed citation without image metadata never generates a poster or storyboard", async ({ page }) => {
  await page.goto("/ask?q=signed-no-poster");
  await page.getByRole("button", { name: /Source 1:/ }).first().click();
  await signedPlayer(page, "");
});

test("public citation keeps the tenant's poster-free player even when the API supplies a thumbnail", async ({ page }) => {
  await page.goto("/ask?q=public-poster");
  await page.getByRole("button", { name: /Source 1:/ }).first().click();
  await expect(page.locator("video")).toBeVisible();
  await expect.poll(() => requests.get(page)?.public).toBe(true);
  await expect(page.locator("img[data-visible][src]")).toHaveCount(0);
});

test("restored conversation preserves signed citation credentials", async ({ page }) => {
  await page.goto("/ask/signed-history");
  await page.getByRole("button", { name: /Source 1:/ }).first().click();
  await signedPlayer(page);
});

test("AI proxies preserve signed metadata in live, early and completed sources", async ({ request }) => {
  for (const [path, data] of [
    ["/api/ai-ask", { prompt: "signed" }],
    ["/api/ai-search", { prompt: "signed" }],
    ["/api/coach", { message: "signed" }],
  ] as const) {
    const response = await request.post(path, { data });
    expect(response.ok()).toBe(true);
    const events = (await response.text()).split("\n\n")
      .filter(line => line.startsWith("data: {")).map(line => JSON.parse(line.slice(6)));
    const sourceEvents = events.filter(event => ["sources", "message_complete", "citation_map"].includes(event.type));
    expect(sourceEvents.map(event => event.type)).toEqual(path === "/api/ai-ask"
      ? ["citation_map", "sources", "message_complete"] : ["sources", "message_complete"]);
    for (const event of sourceEvents) {
      const source = event.sources[0];
      expect(source.playbackPolicy === "signed" && !!source.playbackToken && !!source.storyboardToken && source.thumbnail === "/og-static.png").toBe(true);
    }
  }
});

test("video Q&A retains signed credentials in complete and done citations", async ({ request }) => {
  const response = await request.post("/api/ask", { data: {
    question: "signed", videoId: "signed-demo", subdomain: "voice-test",
  } });
  expect(response.ok()).toBe(true);
  const events = (await response.text()).split("\n\n")
    .filter(line => line.startsWith("data: {")).map(line => JSON.parse(line.slice(6)));
  const completed = events.filter(event => ["complete", "done"].includes(event.type));
  expect(completed.map(event => event.type)).toEqual(["complete", "done"]);
  for (const event of completed) {
    const source = (event.answer?.citations ?? event.citations)[0];
    expect(source.playback_id === "signed-demo" && source.playbackPolicy === "signed" &&
      !!source.playbackToken && !!source.storyboardToken && source.thumbnail === "/og-static.png").toBe(true);
  }
});

for (const touch of [false, true]) {
  test(`library keeps signed posters and public scrubbing on ${touch ? "touch" : "hover"}`, async ({ browser }) => {
    const context = await browser.newContext({ hasTouch: touch, viewport: touch ? { width: 390, height: 844 } : { width: 1280, height: 800 } });
    const page = await context.newPage();
    const fetched: string[] = [];
    await page.route("https://image.mux.com/**", async route => {
      const url = new URL(route.request().url());
      fetched.push(url.pathname);
      if (url.pathname.endsWith("storyboard.json")) {
        await route.fulfill({ json: { url: "http://localhost:4310/og-static.png", tile_width: 200,
          tile_height: 100, duration: 320, tiles: [{ start: 0, x: 0, y: 0 }, { start: 160, x: 200, y: 0 }] } });
      } else await route.fulfill({ body: "" });
    });
    await page.goto("/videos");
    const publicCard = page.locator('li a[href="/v/voice-demo"]');
    await expect(publicCard).toBeVisible();
    if (!touch) await expect.poll(() => fetched.includes("/voice-demo/storyboard.json")).toBe(true);
    for (const slug of ["signed-demo", "signed-token-only", "voice-demo"]) {
      const card = page.locator(`li a[href="/v/${slug}"]`);
      const thumb = card.locator("div").first();
      if (touch) {
        await thumb.dispatchEvent("touchstart", { touches: [{ identifier: 0, clientX: 50, clientY: 50 }] });
        await page.waitForTimeout(450);
      } else {
        await thumb.hover({ position: { x: 30, y: 30 } });
        await thumb.hover({ position: { x: 100, y: 30 } });
      }
      if (slug === "voice-demo") {
        await expect(card.locator('[style*="background-image"]')).toBeVisible();
        expect(fetched.includes("/voice-demo/storyboard.json")).toBe(true);
      } else {
        await expect(card.locator('[style*="background-image"]')).toHaveCount(0);
        await expect(card.locator("span").filter({ hasText: "5:20" })).toBeVisible();
        expect(fetched.some(path => path.includes("signed-demo"))).toBe(false);
        if (!touch) {
          await page.mouse.move(0, 0);
          await expect(card.locator("span").filter({ hasText: "5:20" })).toBeVisible();
        }
      }
      if (touch) await thumb.dispatchEvent("touchend", { touches: [] });
    }
    await context.close();
  });
}
