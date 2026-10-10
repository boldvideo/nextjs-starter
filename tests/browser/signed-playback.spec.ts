import { expect, test, type Page, type Request } from "@playwright/test";

// Failure traces record network URLs, including disposable playback credentials.
test.use({ trace: "off" });

test.beforeEach(async ({ page }) => {
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
const signedPlayer = async (page: Page, storyboard = true, poster = "/og-static.png") => {
  await expect(page.locator("mux-player")).toBeVisible();
  await expect.poll(() => page.locator("mux-player").evaluate((element, expected) => {
    const player = element as HTMLElement & {
      tokens: { playback?: string; storyboard?: string };
      src: string; poster: string; storyboard: string | undefined;
    };
    const stream = new URL(player.src);
    const sheet = player.storyboard ? new URL(player.storyboard) : null;
    return {
      playback: !!player.tokens.playback && stream.searchParams.get("token") === player.tokens.playback,
      storyboard: expected.storyboard
        ? !!player.tokens.storyboard && sheet?.searchParams.get("token") === player.tokens.storyboard
        : !player.tokens.storyboard && !sheet,
      poster: player.poster === expected.poster,
    };
  }, { storyboard, poster })).toEqual({ playback: true, storyboard: true, poster: true });
};

const signedNativePlayer = async (page: Page, manifest: Promise<Request>, provided = false) => {
  await expect(page.locator("video")).toBeVisible();
  const url = new URL((await manifest).url());
  expect(url.pathname === "/signed-demo.m3u8" && !!url.searchParams.get("token") &&
    url.searchParams.has("provided") === provided).toBe(true);
  await expect(page.locator('img[src="/og-static.png"]').first()).toBeVisible();
};

for (const path of ["/v/signed-demo", "/v/signed-demo-stream", "/e/signed-demo", "/e/signed-demo?chat=1", "/pl/signed-test/v/signed-demo"]) {
  test(`signed credentials and poster reach ${path}`, async ({ page }) => {
    const unsigned: string[] = [];
    page.on("request", request => {
      let url = new URL(request.url());
      if (url.pathname === "/_next/image") url = new URL(url.searchParams.get("url")!, page.url());
      if (["stream.mux.com", "image.mux.com"].includes(url.hostname) && url.pathname.includes("signed-demo") && !url.searchParams.has("token")) {
        unsigned.push(url.hostname); // Never retain or log tokenized URLs.
      }
    });
    const manifest = page.waitForRequest(request => new URL(request.url()).hostname === "stream.mux.com");
    await page.goto(path);
    await expect(page).toHaveURL(path);
    await signedNativePlayer(page, manifest, path.includes("-stream"));
    if (path === "/v/signed-demo") {
      expect(await page.locator('meta[property="og:image"]').evaluate(element => {
        const og = new URL(element.getAttribute("content")!, location.origin);
        return og.pathname === "/og" && og.searchParams.get("img") === "/og-static.png";
      })).toBe(true);
      if (process.env.PLAYBACK_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.PLAYBACK_SCREENSHOT_DIR}/signed-desktop-after.png` });
    }
    expect(unsigned).toEqual([]);
  });
}

test("signed video without storyboard and mobile video preserve the API poster", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const manifest = page.waitForRequest(request => new URL(request.url()).hostname === "stream.mux.com");
  await page.goto("/v/signed-demo-no-storyboard");
  await signedNativePlayer(page, manifest);
  if (process.env.PLAYBACK_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.PLAYBACK_SCREENSHOT_DIR}/signed-mobile-after.png` });
});

test("public player and OG URLs are unchanged", async ({ page }) => {
  const manifest = page.waitForRequest(request => new URL(request.url()).hostname === "stream.mux.com");
  await page.goto("/v/voice-demo");
  await expect(page.locator("video")).toBeVisible();
  expect((await manifest).url() === "https://stream.mux.com/voice-demo.m3u8").toBe(true);
  await expect(page.locator('img[src="/og-static.png"]').first()).toBeVisible();
  expect(await page.locator('meta[property="og:image"]').evaluate(element => {
    const og = new URL(element.getAttribute("content")!, location.origin);
    return og.pathname === "/og" && og.searchParams.get("img") ===
      "https://image.mux.com/voice-demo/thumbnail.jpg?width=1120&fit_mode=preserve";
  })).toBe(true);
  if (process.env.PLAYBACK_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.PLAYBACK_SCREENSHOT_DIR}/public-desktop-after.png` });
});

test("homepage prewarm and pointer scrub request only public storyboards", async ({ page }) => {
  const storyboards: string[] = [];
  await page.route("https://image.mux.com/**", route => {
    const url = new URL(route.request().url());
    storyboards.push(url.pathname);
    return route.fulfill({ json: { url: "/og-static.png", tile_width: 400, tile_height: 225,
      duration: 320, tiles: [{ start: 0, x: 0, y: 0 }] } });
  });
  await page.goto("/");
  expect(await page.evaluate(() => matchMedia("(hover: hover) and (pointer: fine)").matches)).toBe(true);
  const signed = page.locator('a[href="/v/signed-demo"]');
  const publicCard = page.locator('a[href="/v/voice-demo"]');
  await expect(signed).toBeVisible();
  await expect.poll(() => storyboards.includes("/voice-demo/storyboard.json")).toBe(true);
  await signed.locator("img").hover();
  await expect(signed.locator('[style*="background-image"]')).toHaveCount(0);
  await expect(signed).toContainText("5:20");
  await publicCard.locator("img").hover();
  await expect(publicCard.locator('[style*="background-image"]')).toHaveCount(1);
  expect(storyboards).toEqual(["/voice-demo/storyboard.json"]);
});

test("signed homepage long press keeps the poster and allows navigation", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage();
  const storyboards: string[] = [];
  await page.route("https://stream.mux.com/**", () => {});
  await page.route("https://image.mux.com/**", route => {
    storyboards.push(new URL(route.request().url()).pathname);
    return route.fulfill({ contentType: "text/vtt", body: "WEBVTT\n\n" });
  });
  await page.goto("/");
  const signed = page.locator('a[href="/v/signed-demo"]');
  await signed.scrollIntoViewIfNeeded();
  await signed.locator("img").dispatchEvent("touchstart", { touches: [{ identifier: 1, clientX: 100, clientY: 200 }] });
  await page.waitForTimeout(450); // exceed the tenant's 350ms long-press threshold
  await expect(signed).toContainText("5:20");
  await expect(signed.locator('[style*="background-image"]')).toHaveCount(0);
  await signed.locator("img").dispatchEvent("touchend", { touches: [] });
  await signed.tap();
  await expect(page).toHaveURL("/v/signed-demo");
  expect(storyboards.some(path => path.includes("signed-demo"))).toBe(false);
  await context.close();
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
  await signedPlayer(page, false, "");
});

test("public citation keeps its implicit timestamp poster even when the API supplies a thumbnail", async ({ page }) => {
  await page.goto("/ask?q=public-poster");
  await page.getByRole("button", { name: /Source 1:/ }).first().click();
  await expect(page.locator("mux-player")).toBeVisible();
  expect(await page.locator("mux-player").evaluate(element => {
    const player = element as HTMLElement & { tokens: { playback?: string }; poster: string };
    return !player.tokens.playback && !player.hasAttribute("poster") && player.poster.includes("image.mux.com/voice-demo/thumbnail");
  })).toBe(true);
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
