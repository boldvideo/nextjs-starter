import { chromium } from "playwright";
const [base, slug, out] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(`${base}/login?redirect=/`, { waitUntil: "networkidle" });
if (p.url().includes("/login")) { await p.fill("#password", "shift2027"); await p.click("button[type=submit]"); await p.waitForURL((u) => !u.pathname.startsWith("/login")); }
await p.goto(`${base}/v/${slug}`, { waitUntil: "networkidle", timeout: 90000 });
await p.getByRole("tab", { name: /Moments/ }).click();
await p.waitForTimeout(600);
await p.getByRole("tab", { name: /Moments/ }).scrollIntoViewIfNeeded();
await p.evaluate(() => { const els = [...document.querySelectorAll("*")].filter((e) => e.scrollHeight > e.clientHeight + 50 && /(auto|scroll)/.test(getComputedStyle(e).overflowY)); els[0]?.scrollBy(0, 560); });
await p.waitForTimeout(600);
await p.screenshot({ path: out });
await b.close();
