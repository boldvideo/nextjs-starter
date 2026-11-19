// usage: node scripts/shot.mjs <url> <out.png> [width] [height] [full|fold] [scrollY]
import { chromium } from "playwright";
const [url, out, w = "1440", h = "900", mode = "fold", y = "0"] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.goto(url, { waitUntil: "networkidle", timeout: 90000 }).catch((e) => errors.push("goto: " + String(e).slice(0, 120)));
await page.waitForTimeout(1200);
if (page.url().includes("/login") && !url.includes("/login")) {
  await page.fill("#password", process.env.GATE_PW || "shift2027");
  await page.click("button[type=submit]");
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 }).catch((e) => errors.push("login: " + String(e).slice(0, 120)));
  await page.goto(url, { waitUntil: "networkidle", timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1200);
}
if (+y) {
  await page.evaluate((yy) => {
    const els = [...document.querySelectorAll("*")].filter((e) => e.scrollHeight > e.clientHeight + 50 && /(auto|scroll)/.test(getComputedStyle(e).overflowY));
    (els[0] ?? document.scrollingElement).scrollTo(0, yy);
  }, +y);
  await page.waitForTimeout(700);
}
await page.screenshot({ path: out, fullPage: mode === "full" });
console.log(JSON.stringify({ title: await page.title(), errors }));
await browser.close();
