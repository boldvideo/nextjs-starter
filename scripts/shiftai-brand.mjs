import { chromium } from "playwright";
const out = process.argv[2];
const font = `<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">`;
const mark = (s) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="#0a0a08" stroke-width="2.6" stroke-linecap="square"><path d="M5 14l7-8 7 8M9 14v5h6v-5"/></svg>`;
const pages = {
  "wordmark-dark.png": [640, 160, `<body style="margin:0;background:transparent;display:flex;align-items:center;height:160px"><div style="font:400 150px/1 'Bebas Neue';letter-spacing:.06em;color:#FAFAF8;padding-top:14px">SHIFT <span style="color:#E8FF47">AI</span></div></body>`, true],
  "wordmark-light.png": [640, 160, `<body style="margin:0;background:transparent;display:flex;align-items:center;height:160px"><div style="font:400 150px/1 'Bebas Neue';letter-spacing:.06em;color:#0A0A08;padding-top:14px">SHIFT <span style="color:#8AAA00">AI</span></div></body>`, true],
  "copilot-avatar.png": [512, 512, `<body style="margin:0;background:#E8FF47;display:flex;align-items:center;justify-content:center;height:512px">${mark(300)}</body>`, false],
  "icon.png": [512, 512, `<body style="margin:0;background:#0A0A08;display:flex;align-items:center;justify-content:center;height:512px"><div style="font:400 250px/1 'Bebas Neue';letter-spacing:.04em;color:#FAFAF8;padding-top:22px">S<span style="color:#E8FF47">AI</span></div></body>`, false],
  "og.png": [1200, 630, `<body style="margin:0;background:#0A0A08;height:630px;position:relative;overflow:hidden"><div style="position:absolute;inset:0;background-image:linear-gradient(rgba(232,255,71,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(232,255,71,.05) 1px,transparent 1px);background-size:64px 64px"></div><div style="position:absolute;right:-200px;top:-260px;width:800px;height:800px;background:radial-gradient(circle,rgba(232,255,71,.12),transparent 65%)"></div><div style="position:relative;padding:72px 80px"><div style="font:400 44px/1 'Bebas Neue';letter-spacing:.06em;color:#FAFAF8">SHIFT <span style="color:#E8FF47">AI</span></div><div style="margin-top:70px;font:400 14px 'DM Mono';letter-spacing:.18em;color:#E8FF47;text-transform:uppercase">The AI Revolution Show · Member library</div><div style="margin-top:22px;font:400 124px/.92 'Bebas Neue';letter-spacing:.03em;color:#FAFAF8">WHICH FOUNDER ALREADY FACED <span style="color:#E8FF47">YOUR DECISION?</span></div></div></body>`, false],
};
const b = await chromium.launch();
for (const [name, [w, h, html, transparent]] of Object.entries(pages)) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await p.setContent(`<html><head>${font}</head>${html}</html>`, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: `${out}/${name}`, omitBackground: transparent });
  await p.close();
}
await b.close();
