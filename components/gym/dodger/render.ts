import { BOSS_TARGET, GROUND, H, POWERUPS, ROCKET_Y, W, isBossStage, multiplier, stageLabel, type Boss, type Game } from "./engine";

/**
 * Draws a frame of Objection Dodger onto the 320×240 screen canvas. The CRT
 * pass (crt.ts) takes it from there.
 */

// 9×11 rocket, drawn row by row
const ROCKET = [
  "....P....",
  "...PPP...",
  "...PWP...",
  "..PPCPP..",
  "..PPPPP..",
  "..PPPPP..",
  ".OPPPPPO.",
  "OOPPPPPOO",
  "OO.PPP.OO",
  "...Y.Y...",
  "..Y...Y..",
];
const ROCKET_COLORS: Record<string, string> = {
  P: "#f6f0ff",
  W: "#22e6ff",
  C: "#ff2ea6",
  O: "#ff2ea6",
  Y: "#ffd23f",
};

// Bosses: 16×12 pixel art, our own, drawn at 2×
const BOSS_ART: Record<string, string[]> = {
  // A front desk with a headset and a closed sign
  gatekeeper: [
    "....HHHHHHHH....",
    "...H........H...",
    "..HH.EE..EE.HH..",
    "..MH.EE..EE.H...",
    "..M...........M.",
    "...M..XXXXXX..M.",
    "....M........M..",
    "BBBBBBBBBBBBBBBB",
    "BSSSSSSSSSSSSSSB",
    "BSSXXXXXXSSSSSSB",
    "BSSSSSSSSSSSSSSB",
    "BBBB........BBBB",
  ],
  // A filing tower with a stamp
  procurement: [
    "......SSSS......",
    "......SSSS......",
    ".....SSSSSS.....",
    "..BBBBBBBBBBBB..",
    "..B.EE....EE.B..",
    "..B.EE....EE.B..",
    "..BBBBBBBBBBBB..",
    "..B..HHHHHH..B..",
    "..BBBBBBBBBBBB..",
    "..B..HHHHHH..B..",
    "..BBBBBBBBBBBB..",
    "..BB........BB..",
  ],
  // A sheet with eyes and a read receipt
  ghosted: [
    ".....BBBBBB.....",
    "...BBBBBBBBBB...",
    "..BBBBBBBBBBBB..",
    "..BBEEBBBBEEBB..",
    "..BBEEBBBBEEBB..",
    "..BBBBBBBBBBBB..",
    "..BBBBBXXBBBBB..",
    "..BBBBBBBBBBBB..",
    "..BBBBBBBBBBBB..",
    "..BBBBBBBBBBBB..",
    "..BB.BBB.BBB.B..",
    "..B...B...B.....",
  ],
  // A calculator with a frown
  cfo: [
    "..BBBBBBBBBBBB..",
    "..BSSSSSSSSSSB..",
    "..BS$$$$$$$$SB..",
    "..BSSSSSSSSSSB..",
    "..BBBBBBBBBBBB..",
    "..B.EE....EE.B..",
    "..B.EE....EE.B..",
    "..B..XXXXXX..B..",
    "..B.X......X.B..",
    "..BBBBBBBBBBBB..",
    "..BHH.HH.HH.HB..",
    "..BBBBBBBBBBBB..",
  ],
};

export interface RenderOpts {
  font: string;
  /** Draw the shake/flash into the frame (the plain fallback without CRT) */
  flashInFrame: boolean;
  reducedMotion: boolean;
  /** Seconds since the page opened, for blinking */
  clock: number;
}

export function money(n: number) {
  return `$${Math.floor(n).toLocaleString("en-US")}`;
}

export function render(ctx: CanvasRenderingContext2D, g: Game, playing: boolean, opts: RenderOpts) {
  const { font } = opts;
  const text = (s: string, x: number, y: number, color: string, size = 14, align: CanvasTextAlign = "left") => {
    ctx.font = `${size}px ${font}`;
    ctx.textAlign = align;
    ctx.fillStyle = color;
    ctx.fillText(s, Math.round(x), Math.round(y));
  };

  ctx.save();
  if (g.shake > 0 && !opts.reducedMotion) {
    ctx.translate(Math.round((Math.random() - 0.5) * g.shake), Math.round((Math.random() - 0.5) * g.shake));
  }

  scene(ctx, g, opts.clock);

  // Falling things
  for (const t of g.things) {
    if (t.kind === "power") {
      const p = POWERUPS[t.power!];
      ctx.fillStyle = "#0b0618";
      ctx.fillRect(Math.round(t.x), Math.round(t.y), t.w, t.h);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(t.x) + 0.5, Math.round(t.y) + 0.5, t.w - 1, t.h - 1);
      text(p.glyph, t.x + t.w / 2, t.y + 11, p.color, 14, "center");
    } else if (t.kind === "block") {
      ctx.fillStyle = "#22e6ff";
      ctx.fillRect(Math.round(t.x), Math.round(t.y), Math.round(t.w), t.h);
      ctx.save();
      ctx.beginPath();
      ctx.rect(Math.round(t.x), Math.round(t.y), Math.round(t.w), t.h);
      ctx.clip();
      const label = t.text.repeat(Math.ceil(t.w / 60) + 1);
      text(label, t.x + 2 - ((opts.clock * 20) % 60), t.y + 10, "#0b0618", 13);
      ctx.restore();
    } else if (t.kind === "bullet") {
      ctx.fillStyle = "#ffd23f";
      ctx.fillRect(Math.round(t.x), Math.round(t.y), t.w, t.h);
      ctx.fillStyle = "#ff2ea6";
      ctx.fillRect(Math.round(t.x) + 1, Math.round(t.y) + 1, t.w - 2, t.h - 2);
    } else {
      // Objection: the line on top, its counter underneath
      let alpha = 1;
      if (t.ghost) {
        alpha = (opts.clock + t.id * 0.37) % 1.3 < 0.22 ? 0.95 : 0.1;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(Math.round(t.x + 4), GROUND + 4, Math.round(t.w - 8), 2);
      }
      ctx.globalAlpha = alpha;
      const locked = g.target === t.id;
      ctx.fillStyle = "#12071f";
      ctx.fillRect(Math.round(t.x), Math.round(t.y), t.w, t.h);
      ctx.fillStyle = locked ? "#ffd23f" : "#ff2ea6";
      ctx.fillRect(Math.round(t.x), Math.round(t.y), t.w, 1);
      ctx.fillRect(Math.round(t.x), Math.round(t.y + t.h - 1), t.w, 1);
      if (locked) {
        ctx.fillRect(Math.round(t.x), Math.round(t.y), 1, t.h);
        ctx.fillRect(Math.round(t.x + t.w - 1), Math.round(t.y), 1, t.h);
      }
      text(t.text, t.x + 5, t.y + 10, "#ffd1ec", 14);
      ctx.globalAlpha = Math.max(alpha, t.ghost ? 0.45 : 1);
      counter(t.counter, t.typed, t.x + 5, t.y + 19, "#22e6ff");
      ctx.globalAlpha = 1;
    }
  }

  if (g.boss) boss(ctx, g.boss, g.target === BOSS_TARGET, opts.clock);

  // Lasers
  for (const l of g.lasers) {
    ctx.strokeStyle = l.color;
    ctx.globalAlpha = Math.min(1, l.t * 14);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(l.x1 + 0.5, l.y1);
    ctx.lineTo(l.x2 + 0.5, l.y2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // The launch (blinks while hurt)
  if (!g.over && (g.hurt <= 0 || Math.floor(g.hurt * 12) % 2 === 0)) {
    const ox = Math.round(g.x - 9);
    const oy = ROCKET_Y;
    ROCKET.forEach((row, y) =>
      row.split("").forEach((c, x) => {
        if (c === "." || (c === "Y" && Math.random() < 0.35)) return;
        ctx.fillStyle = ROCKET_COLORS[c];
        ctx.fillRect(ox + x * 2, oy + y * 2, 2, 2);
      })
    );
    if (g.graze > 0) {
      ctx.strokeStyle = "#22e6ff";
      ctx.strokeRect(ox - 3.5, oy - 3.5, 25, 29);
    }
  }

  // Particles
  for (const p of g.particles) {
    ctx.globalAlpha = Math.min(1, (p.life / p.max) * 1.5);
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
  }
  ctx.globalAlpha = 1;

  for (const p of g.popups) {
    ctx.globalAlpha = Math.min(1, p.t * 3);
    text(p.text, p.x, p.y, p.color, p.size, "center");
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  if (playing) {
    // HUD
    text("PIPELINE", 6, 12, "#ff2ea6", 14);
    text(money(g.score), 6, 24, "#f6f0ff", 16);
    text(`LEVEL ${stageLabel(g.stage)}`, W / 2, 12, isBossStage(g.stage) ? "#ff2ea6" : "#ffd23f", 14, "center");
    const m = multiplier(g);
    if (g.slow > 0) text("SLOW-MO", W / 2, 24, "#22e6ff", 14, "center");
    else if (m > 1) text(`COMBO x${m}`, W / 2, 24, m >= 8 ? "#ffd23f" : "#7dffb0", 14, "center");
    text("RUNWAY", W - 6, 12, "#22e6ff", 14, "right");
    text("♥".repeat(Math.max(0, g.lives)), W - 6, 24, "#ff2ea6", 14, "right");

    if (g.banner) {
      const pop = Math.min(1, (2.4 - Math.min(2.4, g.banner.t)) * 8);
      text(g.banner.text, W / 2, 96, g.banner.color, Math.round(14 + 10 * pop), "center");
      if (g.banner.sub) text(g.banner.sub, W / 2, 112, "#f6f0ff", 14, "center");
    }
  }

  if (opts.flashInFrame && g.flash > 0) {
    ctx.fillStyle = `rgba(255,46,166,${Math.min(0.5, g.flash * 0.4)})`;
    ctx.fillRect(0, 0, W, H);
  }

  function counter(word: string, typed: number, x: number, y: number, color: string) {
    ctx.font = `12px ${font}`;
    ctx.textAlign = "left";
    const done = word.slice(0, typed);
    ctx.fillStyle = "#ffd23f";
    ctx.fillText(done, Math.round(x), Math.round(y));
    ctx.fillStyle = color;
    ctx.fillText(word.slice(typed), Math.round(x + ctx.measureText(done).width), Math.round(y));
  }

  function boss(c: CanvasRenderingContext2D, b: Boss, locked: boolean, clock: number) {
    const art = BOSS_ART[b.def.id] ?? BOSS_ART.cfo;
    const ox = Math.round(b.x - 16);
    const oy = Math.round(b.y - 2 + Math.sin(clock * 3) * 2);
    const palette: Record<string, string> = {
      B: b.hitT > 0 && Math.floor(b.hitT * 20) % 2 === 0 ? "#ffffff" : b.def.color,
      S: "#f6f0ff",
      E: "#0b0618",
      H: "#ff8a1f",
      M: "#8b7bb5",
      X: "#ff2ea6",
      $: "#7dffb0",
    };
    art.forEach((row, y) =>
      row.split("").forEach((ch, x) => {
        const color = palette[ch];
        if (!color) return;
        c.fillStyle = color;
        c.fillRect(ox + x * 2, oy + y * 2, 2, 2);
      })
    );
    // Glow under the boss
    c.fillStyle = b.def.color;
    c.globalAlpha = 0.25;
    c.fillRect(ox - 2, oy + 25, 36, 1);
    c.globalAlpha = 1;

    if (b.entering) return;
    // The word that hurts it
    c.font = `14px ${font}`;
    const w = c.measureText(b.word).width + 10;
    const wx = Math.round(b.x - w / 2);
    const wy = oy + 28;
    c.fillStyle = "#12071f";
    c.fillRect(wx, wy, Math.round(w), 13);
    c.fillStyle = locked ? "#ffd23f" : b.def.color;
    c.fillRect(wx, wy, Math.round(w), 1);
    c.fillRect(wx, wy + 12, Math.round(w), 1);
    c.textAlign = "left";
    const done = b.word.slice(0, b.typed);
    c.fillStyle = "#ffd23f";
    c.fillText(done, wx + 5, wy + 10);
    c.fillStyle = "#f6f0ff";
    c.fillText(b.word.slice(b.typed), wx + 5 + c.measureText(done).width, wy + 10);

    // HP bar under the HUD
    const bw = 120;
    c.fillStyle = "#12071f";
    c.fillRect(W / 2 - bw / 2, 30, bw, 5);
    c.fillStyle = b.def.color;
    c.fillRect(W / 2 - bw / 2 + 1, 31, Math.round((bw - 2) * (b.hp / b.max)), 3);
  }
}

function scene(ctx: CanvasRenderingContext2D, g: Game, clock: number) {
  const bossy = Boolean(g.boss);
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, bossy ? "#14030c" : "#0b0618");
  sky.addColorStop(0.6, bossy ? "#4a0b2a" : "#2a0b4a");
  sky.addColorStop(1, bossy ? "#380818" : "#1c0838");
  ctx.fillStyle = sky;
  ctx.fillRect(-12, -12, W + 24, H + 24);

  for (const s of g.stars) {
    ctx.fillStyle = s.s > 0.7 ? "#ffffff" : "#8b7bb5";
    ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
  }

  // Striped sun sitting on the horizon
  const horizon = 150;
  const sunR = 46;
  for (let y = -sunR; y < 0; y++) {
    const band = (y + sunR) / sunR;
    if (band > 0.45 && Math.floor((y + sunR) / 3) % 2 === 1) continue;
    const half = Math.sqrt(sunR * sunR - y * y);
    ctx.fillStyle = band < 0.35 ? "#ffe45c" : band < 0.6 ? "#ffb03a" : band < 0.8 ? "#ff5a8a" : "#ff2ea6";
    ctx.fillRect(Math.round(W / 2 - half), horizon + y, Math.round(half * 2), 1);
  }

  // Floor grid rolling toward you, faster as the run heats up
  ctx.fillStyle = bossy ? "#2a0614" : "#1c0838";
  ctx.fillRect(-12, horizon, W + 24, H - horizon + 12);
  ctx.fillStyle = bossy ? "rgba(255,46,100,0.6)" : "rgba(255,46,166,0.55)";
  for (let i = -12; i <= 12; i++) {
    const x0 = W / 2 + i * 8;
    const x1 = W / 2 + i * 60;
    for (let t = 0; t < 1; t += 0.02) {
      ctx.fillRect(Math.round(x0 + (x1 - x0) * t), Math.round(horizon + (H - horizon) * t), 1, 1);
    }
  }
  const speed = 18 + Math.min(g.stage, 12) * 6;
  const floor = (clock * speed) % 16;
  ctx.fillStyle = "rgba(34,230,255,0.5)";
  for (let k = 0; k < 7; k++) {
    const d = ((k * 16 + floor) / 112) ** 2;
    ctx.fillRect(0, Math.round(horizon + d * (H - horizon)), W, 1);
  }
  ctx.fillStyle = "#ff2ea6";
  ctx.fillRect(0, horizon, W, 1);
}
