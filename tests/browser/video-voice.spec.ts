import { test, expect } from "@playwright/test";
import { caption, mockVoice, preparePlayer } from "@/tests/browser/voice-mocks";

const mic = (page: import("@playwright/test").Page) => page.getByRole("button", { name: "Start voice conversation" });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("bold-video-tab", "chat");
    localStorage.setItem("bold-video-companion-tab", "chat");
    localStorage.setItem("theme", "light");
  });
  // Keep the Next development badge from covering the mobile Info tab.
  // Application exceptions are still asserted independently below.
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = "nextjs-portal { display: none; }";
    document.addEventListener("DOMContentLoaded", () => document.head.append(style));
  });
  page.on("pageerror", error => { throw error; });
});

test("voice is opt-in, survives canonical redirect, and defaults off", async ({ page }) => {
  await mockVoice(page);
  await page.goto("/v/voice-demo");
  await expect(page.getByRole("textbox", { name: "Ask about this video" }).filter({ visible: true })).toBeVisible();
  await expect(mic(page)).toHaveCount(0);
  await page.goto("/v/11111111-1111-4111-8111-111111111111?t=83&voice=1");
  await expect(page).toHaveURL(/voice-demo\?t=83&voice=1$/);
  await expect(mic(page).filter({ visible: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __voice: { requests: number } }).__voice.requests)).toBe(0);
  await page.goto("/v/voice-demo?voice=0");
  await expect(mic(page)).toHaveCount(0);
});

for (const preview of ["1", "0"]) {
  for (const mobile of [false, true]) {
    test(`voice=${preview} survives playlist links and autoplay ${mobile ? "mobile" : "desktop"}`, async ({ page }) => {
      await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 800 });
      await page.addInitScript(() => localStorage.setItem("bold-autoplay", "true"));
      await mockVoice(page);
      const firstUrl = `/pl/test/v/voice-demo?voice=${preview}`;
      const nextUrl = `/pl/test/v/voice-next?voice=${preview}`;
      await page.goto(firstUrl);
      await expect(page.getByRole("textbox", { name: "Ask about this video" }).filter({ visible: true })).toBeVisible();
      if (mobile) await page.getByRole("button", { name: "Playlist", exact: true }).click();
      const nextLink = page.getByRole("link", { name: /Build a daily rhythm/ }).filter({ visible: true });
      await expect(nextLink).toHaveAttribute("href", nextUrl);
      if (!mobile) {
        const sidebar = page.locator('[data-sidebar][data-side="left"]');
        const toggle = sidebar.getByRole("button", { name: "Close sidebar", exact: true }).filter({ visible: true });
        await toggle.click();
        await expect(sidebar).toHaveAttribute("data-collapsed", "true");
        await expect(nextLink).toHaveAttribute("href", nextUrl);
        await toggle.click();
        await expect(sidebar).toHaveAttribute("data-collapsed", "false");
      }
      await nextLink.click();
      await expect(page).toHaveURL(nextUrl);
      if (mobile) await page.getByRole("button", { name: "Chat", exact: true }).filter({ visible: true }).click();
      if (preview === "1") await expect(mic(page).filter({ visible: true })).toBeVisible();
      else await expect(mic(page)).toHaveCount(0);

      await page.goto(firstUrl);
      await preparePlayer(page);
      await page.locator("mux-player").evaluate(element => element.dispatchEvent(new Event("ended")));
      await expect(page).toHaveURL(nextUrl);
    });
  }
}

for (const mobile of [false, true]) {
  test(`captions, draft, mute, timestamp playback, and end ${mobile ? "mobile" : "desktop"}`, async ({ page }) => {
    await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 800 });
    await mockVoice(page);
    await page.goto("/v/voice-demo?voice=1");
    await preparePlayer(page);
    const input = page.getByRole("textbox", { name: "Ask about this video" }).filter({ visible: true });
    await input.fill("How can I make this a daily habit?");
    const conversation = page.getByRole("region", { name: "Video conversation", exact: true }).filter({ visible: true });
    if (process.env.CAPTURE_VOICE_SCREENSHOTS && !mobile) {
      await input.locator("..").screenshot({ path: ".github/media/voice-composer.png" });
    }
    await mic(page).filter({ visible: true }).evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
    await expect(page.getByRole("group", { name: "Voice conversation" }).filter({ visible: true })).toBeFocused();
    await expect(page.getByText("Listening…").filter({ visible: true })).toBeVisible();
    await caption(page, "input", "How do I protect time for focused work?");
    await caption(page, "output", "Start with one small block of time. At 1:");
    await caption(page, "output", "23, the lesson shows how to remove distractions. Try the exercise at 0:00 too.");
    await expect(page.getByRole("button", { name: "Play video at 1:23" }).filter({ visible: true })).toHaveCount(1);
    await page.getByRole("button", { name: "Mute microphone", exact: true }).filter({ visible: true }).click();
    await expect(page.getByText("Microphone muted", { exact: true }).filter({ visible: true })).toBeVisible();
    await page.getByRole("button", { name: "Unmute microphone" }).filter({ visible: true }).click();
    if (process.env.CAPTURE_VOICE_SCREENSHOTS) {
      await conversation.screenshot({ path: `.github/media/voice-${mobile ? "mobile" : "desktop"}.png` });
      if (!mobile) {
        await page.evaluate(() => document.documentElement.classList.add("dark"));
        await conversation.screenshot({ path: ".github/media/voice-desktop-dark.png" });
        await page.evaluate(() => document.documentElement.classList.remove("dark"));
      }
    }
    await page.getByRole("button", { name: "Play video at 0:00" }).filter({ visible: true }).click();
    expect(await page.locator("mux-player").evaluate(element => (element as HTMLVideoElement).currentTime)).toBe(0);
    await expect(page.getByText("Video playing", { exact: true }).filter({ visible: true })).toBeVisible();
    expect(await page.evaluate(() => {
      const voice = (window as unknown as { __voice: { track: { enabled: boolean }; audioMuted: boolean } }).__voice;
      return [voice.track.enabled, voice.audioMuted];
    })).toEqual([false, true]);
    await page.locator("mux-player").evaluate(element => (element as HTMLVideoElement).pause());
    await expect(page.getByText("Listening…").filter({ visible: true })).toBeVisible();
    expect(await page.evaluate(() => {
      const voice = (window as unknown as { __voice: { track: { enabled: boolean }; audioMuted: boolean } }).__voice;
      return [voice.track.enabled, voice.audioMuted];
    })).toEqual([true, false]);
    await page.getByRole("button", { name: "End voice conversation" }).filter({ visible: true }).click();
    await expect(input).toHaveValue("How can I make this a daily habit?");
    await expect(mic(page).filter({ visible: true })).toBeFocused();
    expect(await page.evaluate(() => (window as unknown as { __voice: { requests: number; stops: number } }).__voice)).toMatchObject({ requests: 1, stops: 1 });
  });
}

test("pagehide releases media and restores a usable composer after page restoration", async ({ page }) => {
  await mockVoice(page);
  await page.goto("/v/voice-demo?voice=1");
  await preparePlayer(page);
  await mic(page).filter({ visible: true }).click();
  await expect(page.getByText("Listening…").filter({ visible: true })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true })));
  await expect(mic(page).filter({ visible: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __voice: { stops: number } }).__voice.stops)).toBe(1);
});

test("reduced motion keeps the orb still and keyboard controls usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockVoice(page);
  await page.goto("/v/voice-demo?voice=1");
  await preparePlayer(page);
  await mic(page).filter({ visible: true }).focus();
  await page.keyboard.press("Enter");
  const bar = page.getByRole("group", { name: "Voice conversation" }).filter({ visible: true });
  await expect(bar).toBeFocused();
  await expect(bar.locator('[role="status"], [aria-live]')).toHaveCount(0);
  await expect(bar.locator("span")).toHaveCSS("transform", "none");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Mute microphone", exact: true }).filter({ visible: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(mic(page).filter({ visible: true })).toBeFocused();
});

test("switching responsive surfaces preserves one session; hiding chat releases the mic", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockVoice(page);
  await page.goto("/v/voice-demo?voice=1");
  await preparePlayer(page);
  await mic(page).filter({ visible: true }).click();
  await expect(page.getByText("Listening…").filter({ visible: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText("Listening…").filter({ visible: true })).toBeVisible();
  await page.getByRole("button", { name: "Info", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __voice: { stops: number } }).__voice.stops)).toBe(1);
  await page.getByRole("button", { name: "Chat", exact: true }).filter({ visible: true }).click();
  await expect(mic(page).filter({ visible: true })).toBeVisible();
});

test("permission cancellation stops late tracks and never creates a paid session", async ({ page }) => {
  await mockVoice(page, { permission: "pending" });
  let brokerRequests = 0;
  page.on("request", request => { if (request.url().includes("ai/voice/sessions")) brokerRequests++; });
  await page.goto("/v/voice-demo?voice=1");
  await preparePlayer(page);
  await mic(page).filter({ visible: true }).click();
  await page.getByRole("button", { name: "End voice conversation" }).filter({ visible: true }).click();
  await page.evaluate(() => (window as unknown as { __voice: { grant: () => void } }).__voice.grant());
  await expect.poll(() => page.evaluate(() => (window as unknown as { __voice: { stops: number } }).__voice.stops)).toBe(1);
  expect(brokerRequests).toBe(0);
  await expect(mic(page).filter({ visible: true })).toBeFocused();
});

for (const failure of ["permission", "allowance"] as const) {
  test(`${failure} failure restores text chat with actionable feedback`, async ({ page }) => {
    await mockVoice(page, failure === "permission" ? { permission: "denied" } : { brokerStatus: 402 });
    await page.goto("/v/voice-demo?voice=1");
    await preparePlayer(page);
    await mic(page).filter({ visible: true }).click();
    await expect(page.getByText(failure === "permission" ? /Microphone access was blocked/ : /used its voice allowance/).filter({ visible: true })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Ask about this video" }).filter({ visible: true })).toBeEnabled();
  });
}
