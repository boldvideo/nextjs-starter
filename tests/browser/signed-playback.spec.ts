import { expect, test, type Page } from "@playwright/test";

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

for (const path of ["/v/signed-demo", "/e/signed-demo", "/e/signed-demo?chat=1", "/pl/signed-test/v/signed-demo"]) {
  test(`signed credentials and poster reach ${path}`, async ({ page }) => {
    const unsigned: string[] = [];
    page.on("request", request => {
      let url = new URL(request.url());
      if (url.pathname === "/_next/image") url = new URL(url.searchParams.get("url")!, page.url());
      if (["stream.mux.com", "image.mux.com"].includes(url.hostname) && url.pathname.includes("signed-demo") && !url.searchParams.has("token")) {
        unsigned.push(url.hostname); // Never retain or log tokenized URLs.
      }
    });
    await page.goto(path);
    await expect(page).toHaveURL(path);
    await signedPlayer(page);
    if (path === "/v/signed-demo") {
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/og-static\.png$/);
      if (process.env.PLAYBACK_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.PLAYBACK_SCREENSHOT_DIR}/signed-desktop-after.png` });
    }
    expect(unsigned).toEqual([]);
  });
}

test("signed video without storyboard and mobile video preserve the API poster", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/v/signed-demo-no-storyboard");
  await signedPlayer(page, false);
  if (process.env.PLAYBACK_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.PLAYBACK_SCREENSHOT_DIR}/signed-mobile-after.png` });
});

test("public player and OG URLs are unchanged", async ({ page }) => {
  await page.goto("/v/voice-demo");
  await expect(page.locator("mux-player")).toBeVisible();
  expect(await page.locator("mux-player").evaluate(element => {
    const player = element as HTMLElement & { tokens: { playback?: string }; poster: string; storyboard: string; src: string };
    return !player.tokens.playback && player.poster === "/og-static.png" &&
      player.storyboard === "https://image.mux.com/voice-demo/storyboard.vtt" && !new URL(player.src).searchParams.has("token");
  })).toBe(true);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://image.mux.com/voice-demo/thumbnail.jpg?width=1200&fit_mode=preserve");
  if (process.env.PLAYBACK_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.PLAYBACK_SCREENSHOT_DIR}/public-desktop-after.png` });
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
