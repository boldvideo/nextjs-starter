import { expect, test, type Page } from "@playwright/test";

const media = new WeakMap<Page, { signed: boolean; public: boolean; unsigned: string[] }>();

test.beforeEach(async ({ page }) => {
  const { data } = await (await page.request.get("http://127.0.0.1:4311/api/v1/videos/signed-demo")).json();
  const state = { signed: false, public: false, unsigned: [] as string[] };
  media.set(page, state);
  page.on("request", request => {
    let url = new URL(request.url());
    if (url.pathname === "/_next/image") url = new URL(url.searchParams.get("url")!, page.url());
    if (!["stream.mux.com", "image.mux.com"].includes(url.hostname)) return;
    if (url.pathname.includes("signed-") && !url.searchParams.has("token")) state.unsigned.push(url.hostname);
    if (url.hostname === "stream.mux.com") {
      if (url.pathname === "/signed-demo.m3u8") state.signed = url.searchParams.get("token") === data.playback_token;
      if (url.pathname === "/voice-demo.m3u8") state.public = !url.searchParams.has("token");
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
  await expect.poll(() => media.get(page)?.signed).toBe(true);
  const image = page.locator("img[data-visible]");
  if (poster) await expect(image).toHaveAttribute("src", poster);
  else await expect(image).toHaveCount(0);
  expect(media.get(page)?.unsigned).toEqual([]);
};

for (const path of ["/v/signed-demo", "/e/signed-demo", "/e/signed-demo?chat=1", "/pl/signed-test/v/signed-demo"]) {
  test(`signed credentials and poster reach ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(path);
    await signedPlayer(page);
    if (path === "/v/signed-demo") {
      expect(await page.locator('meta[property="og:image"]').evaluate(element => {
        const og = new URL(element.getAttribute("content")!, location.origin);
        return og.pathname === "/og" && og.searchParams.get("img") === "/og-static.png";
      })).toBe(true);
      if (process.env.PLAYBACK_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.PLAYBACK_SCREENSHOT_DIR}/signed-desktop-after.png` });
    }
    expect(media.get(page)?.unsigned).toEqual([]);
  });
}

test("signed video without storyboard and mobile video preserve the API poster", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/v/signed-demo-no-storyboard");
  await signedPlayer(page);
  if (process.env.PLAYBACK_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.PLAYBACK_SCREENSHOT_DIR}/signed-mobile-after.png` });
});

test("public player and OG URLs are unchanged", async ({ page }) => {
  await page.goto("/v/voice-demo");
  await expect(page.locator("video")).toBeVisible();
  await expect.poll(() => media.get(page)?.public).toBe(true);
  await expect(page.locator("img[data-visible]")).toHaveAttribute("src", "/og-static.png");
  expect(await page.locator('meta[property="og:image"]').evaluate(element => {
    const og = new URL(element.getAttribute("content")!, location.origin);
    return og.pathname === "/og" && og.searchParams.get("img") === "https://image.mux.com/voice-demo/thumbnail.jpg?width=1120&fit_mode=preserve";
  })).toBe(true);
  if (process.env.PLAYBACK_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.PLAYBACK_SCREENSHOT_DIR}/public-desktop-after.png` });
});

for (const mobile of [false, true]) {
  test(`signed Ask citation receives credentials on ${mobile ? "mobile" : "desktop"}`, async ({ page }) => {
    await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 800 });
    await page.goto("/ask?q=signed");
    await page.getByRole("button", { name: /Source 1:/ }).first().click();
    await signedPlayer(page);
    if (process.env.PLAYBACK_SCREENSHOT_DIR) await page.screenshot({ animations: "disabled", path: `${process.env.PLAYBACK_SCREENSHOT_DIR}/citation-${mobile ? "mobile" : "desktop"}-after.png` });
  });
}

test("signed citation without image metadata never generates a poster or storyboard", async ({ page }) => {
  await page.goto("/ask?q=signed-no-poster");
  await page.getByRole("button", { name: /Source 1:/ }).first().click();
  await signedPlayer(page, "");
});

test("public Video.js citation keeps its existing empty poster even when the API supplies a thumbnail", async ({ page }) => {
  await page.goto("/ask?q=public-poster");
  await page.getByRole("button", { name: /Source 1:/ }).first().click();
  await expect(page.locator("video")).toBeVisible();
  await expect.poll(() => media.get(page)?.public).toBe(true);
  await expect(page.locator("img[data-visible]")).toHaveCount(0);
});

test("restored conversation preserves signed citation credentials", async ({ page }) => {
  await page.goto("/ask/signed-history");
  await page.getByRole("button", { name: /Source 1:/ }).first().click();
  await signedPlayer(page);
});

for (const path of ["/", "/videos"]) {
  for (const mobile of [false, true]) {
    test(`signed cards keep their poster and duration without scrubbing at ${path} on ${mobile ? "touch" : "desktop"}`, async ({ page }) => {
      await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 });
      let publicStoryboards = 0;
      await page.route("https://image.mux.com/**/storyboard.json", route => {
        if (new URL(route.request().url()).pathname === "/voice-demo/storyboard.json") publicStoryboards++;
        return route.fulfill({ json: { url: new URL("/og-static.png", page.url()).href, tile_width: 1200, tile_height: 630,
          duration: 320, tiles: [{ start: 0, x: 0, y: 0 }] } });
      });
      await page.goto(path);
      if (!mobile && path === "/") await expect.poll(() => publicStoryboards).toBeGreaterThan(0); // idle prewarming
      for (const slug of ["signed-demo", "signed-policy-only", "signed-token-only"]) {
        const card = page.locator(`a[href="/v/${slug}"]`).filter({ has: page.locator("img") }).first();
        await expect(card).toBeVisible();
        await expect(card.getByText("5:20", { exact: true })).toBeVisible();
        const thumb = card.locator("img").locator("..");
        if (mobile) {
          await thumb.evaluate(element => element.dispatchEvent(new TouchEvent("touchstart", {
            bubbles: true, touches: [new Touch({ identifier: 1, target: element, clientX: 100, clientY: 100 })],
          })));
          await page.waitForTimeout(400);
          await thumb.evaluate(element => element.dispatchEvent(new TouchEvent("touchmove", {
            bubbles: true, touches: [new Touch({ identifier: 1, target: element, clientX: 200, clientY: 100 })],
          })));
          await expect(card.getByText("5:20", { exact: true })).toBeVisible();
          await expect(thumb.locator('div[style*="background-image"]')).toHaveCount(0);
          await thumb.dispatchEvent("touchend", { touches: [] });
        } else {
          await thumb.hover({ position: { x: 100, y: 40 } });
          await thumb.hover({ position: { x: 200, y: 40 } });
        }
        await expect(card.getByText("5:20", { exact: true })).toBeVisible();
        await expect(thumb.locator('div[style*="background-image"]')).toHaveCount(0);
        expect(await card.locator("img").evaluate(img => new URL(img.getAttribute("src")!, location.origin).searchParams.get("url") === "/og-static.png")).toBe(true);
      }
      const publicCard = page.locator('a[href="/v/voice-demo"]').filter({ has: page.locator("img") }).first();
      await publicCard.locator("img").hover();
      await expect.poll(() => publicStoryboards).toBeGreaterThan(0);
      await expect(publicCard.locator('div[style*="background-image"]')).toBeVisible();
      await expect(publicCard.getByText("5:20", { exact: true })).not.toBeVisible();
      expect(media.get(page)?.unsigned).toEqual([]);
      if (process.env.PLAYBACK_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.PLAYBACK_SCREENSHOT_DIR}/${path === "/" ? "library" : "episodes"}-${mobile ? "mobile" : "desktop"}-after.png` });
    });
  }
}

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
