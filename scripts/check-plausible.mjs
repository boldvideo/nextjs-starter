import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage(); const hits = [];
p.on("request", (r) => /plausible/.test(r.url()) && hits.push(r.method() + " " + r.url().slice(0, 90)));
await p.goto("https://shiftai.bold.video/login?redirect=/", { waitUntil: "networkidle" });
await p.fill("#password", "shift2027"); await p.click("button[type=submit]"); await p.waitForURL((u) => !u.pathname.startsWith("/login"));
await p.waitForTimeout(4000);
console.log(JSON.stringify(hits, null, 1)); await b.close();
