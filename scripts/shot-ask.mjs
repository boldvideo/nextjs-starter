// usage: node scripts/shot-ask.mjs <base> <question> <out.png> [waitMs]
import { chromium } from "playwright";
const [base, q, out, wait = "45000"] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.goto(`${base}/login?redirect=/`, { waitUntil: "networkidle" });
if (page.url().includes("/login")) {
  await page.fill("#password", "shift2027");
  await page.click("button[type=submit]");
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 });
}
await page.goto(`${base}/ask?q=${encodeURIComponent(q)}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(+wait);
await page.screenshot({ path: out });
console.log(JSON.stringify({ url: page.url(), errors }));
await browser.close();
