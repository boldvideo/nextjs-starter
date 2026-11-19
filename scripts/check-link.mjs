import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] }); const p = await b.newPage();
await p.goto(process.argv[2], { waitUntil: "networkidle" });
const gated = p.url().includes("/login");
if (gated) { await p.fill("#password", "shift2027"); await p.click("button[type=submit]"); await p.waitForURL((u) => !u.pathname.startsWith("/login")); await p.waitForLoadState("networkidle"); }
await p.waitForSelector("video", { timeout: 30000 }).catch(() => {});
await p.waitForTimeout(2500);
console.log(JSON.stringify({ gatedFirst: gated, landed: p.url().replace(/^https:\/\/[^/]+/, ""), title: await p.title(), t: await p.evaluate(() => Math.round(document.querySelector("video")?.currentTime ?? -1)) }));
await b.close();
