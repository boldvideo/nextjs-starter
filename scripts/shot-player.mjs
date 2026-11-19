// Plays an episode in headless Chromium and reports whether time advances and a seek lands.
import { chromium } from "playwright";
const [base, slug, out] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
await page.goto(`${base}/login?redirect=/`, { waitUntil: "networkidle" });
if (page.url().includes("/login")) { await page.fill("#password", "shift2027"); await page.click("button[type=submit]"); await page.waitForURL((u) => !u.pathname.startsWith("/login")); }
await page.goto(`${base}/v/${slug}`, { waitUntil: "networkidle", timeout: 90000 });
await page.waitForSelector("video", { timeout: 30000 });
const state = () => page.evaluate(() => { const v = document.querySelector("video"); return v ? { t: +v.currentTime.toFixed(1), paused: v.paused, ready: v.readyState, dur: Math.round(v.duration || 0), tracks: [...v.textTracks].map((t) => `${t.kind}:${t.cues?.length ?? "?"}`) } : null; });
const before = await state();
await page.evaluate(() => { const v = document.querySelector("video"); v.muted = true; return v.play().catch((e) => String(e)); });
await page.waitForTimeout(6000);
const playing = await state();
// seek the way the page does it: click the second "brief" cell if present, else a chapter stamp
const pill = page.locator('button[aria-label*="play from"]').nth(1);
let clicked = null;
if (await pill.count()) { clicked = await pill.getAttribute("aria-label"); await pill.click(); }
await page.waitForTimeout(5000);
const afterSeek = await state();
await page.mouse.move(500, 300);
await page.waitForTimeout(400);
await page.screenshot({ path: out });
console.log(JSON.stringify({ before, playing, clicked, afterSeek, errors: errors.slice(0, 6) }, null, 1));
await browser.close();
