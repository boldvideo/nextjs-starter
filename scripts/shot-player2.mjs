import { chromium } from "playwright";
const [base, slug, out] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${base}/login?redirect=/`, { waitUntil: "networkidle" });
if (page.url().includes("/login")) { await page.fill("#password", "shift2027"); await page.click("button[type=submit]"); await page.waitForURL((u) => !u.pathname.startsWith("/login")); }
await page.goto(`${base}/v/${slug}?t=780`, { waitUntil: "networkidle", timeout: 90000 });
await page.waitForSelector("video");
await page.evaluate(() => { const v = document.querySelector("video"); v.muted = true; return v.play().catch(() => {}); });
await page.waitForTimeout(3500);
await page.mouse.move(420, 420); await page.waitForTimeout(300); await page.mouse.move(430, 505); await page.waitForTimeout(700);
await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1440, height: 620 } });
console.log(await page.evaluate(() => Math.round(document.querySelector("video").currentTime)));
await browser.close();
