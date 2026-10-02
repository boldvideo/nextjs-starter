"use client";

import { useEffect, useRef } from "react";

/**
 * Bold's wordmark that comes apart under the cursor. At rest it's the clean
 * vector logo. Near the pointer it breaks into pixels: the cells thin out
 * through a 4x4 Bayer dither, get pushed away from the pointer, and pick up
 * a pink/cyan CRT split. When the pointer leaves they spring home and the
 * logo snaps solid again. Touch works by dragging across it. Reduced motion
 * gets the plain logo. The loop only runs while something is moving.
 */

const SRC = "/bold-logo.svg";
const RATIO = 267 / 975;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const RADIUS = 150; // px of influence around the pointer
const PUSH = 2.2; // repel strength
const SPRING = 0.07; // pull back home
const DAMP = 0.82;
const TEAL: [number, number, number] = [65, 198, 166];
const PINK: [number, number, number] = [255, 46, 166];
const CYAN: [number, number, number] = [34, 230, 255];

export function BoldDitherLogo({ href, className }: { href: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const img = new Image();
    let width = 0;
    let height = 0;
    let cell = 4;
    let cols = 0;
    let rows = 0;
    // Only the cells inside the logo: home position + offset + velocity
    let hx = new Float32Array();
    let hy = new Float32Array();
    let ox = new Float32Array();
    let oy = new Float32Array();
    let vx = new Float32Array();
    let vy = new Float32Array();
    let bayer = new Float32Array();
    let pointer: { x: number; y: number } | null = null;
    let raf = 0;
    let running = false;

    const layout = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.width * RATIO;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = width < 640 ? 3 : 4;
      cols = Math.ceil(width / cell);
      rows = Math.ceil(height / cell);
      if (!img.complete || !cols || !rows) return;

      const off = document.createElement("canvas");
      off.width = cols;
      off.height = rows;
      const octx = off.getContext("2d");
      if (!octx) return;
      octx.drawImage(img, 0, 0, cols, rows);
      const data = octx.getImageData(0, 0, cols, rows).data;
      const xs: number[] = [];
      const ys: number[] = [];
      const bs: number[] = [];
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (data[(y * cols + x) * 4 + 3] < 110) continue;
          xs.push(x * cell);
          ys.push(y * cell);
          bs.push(BAYER[(y % 4) * 4 + (x % 4)]);
        }
      }
      hx = Float32Array.from(xs);
      hy = Float32Array.from(ys);
      bayer = Float32Array.from(bs);
      ox = new Float32Array(xs.length);
      oy = new Float32Array(xs.length);
      vx = new Float32Array(xs.length);
      vy = new Float32Array(xs.length);
    };

    const paint = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
    };

    // One frame: physics, then punch the disturbed cells out of the clean
    // logo and redraw them as loose, dithered, tinted pixels
    const frame = () => {
      paint();
      let moving = false;
      const px = pointer?.x ?? -1e4;
      const py = pointer?.y ?? -1e4;
      const loose: number[] = [];
      const heats: number[] = [];

      for (let i = 0; i < hx.length; i++) {
        const cx = hx[i] + cell / 2;
        const cy = hy[i] + cell / 2;
        const dx = cx - px;
        const dy = cy - py;
        const d = Math.hypot(dx, dy);
        let heat = 0;
        if (d < RADIUS) {
          heat = 1 - d / RADIUS;
          heat *= heat;
          const f = (PUSH * heat) / Math.max(d, 1);
          vx[i] += dx * f;
          vy[i] += dy * f;
        }
        vx[i] = (vx[i] - ox[i] * SPRING) * DAMP;
        vy[i] = (vy[i] - oy[i] * SPRING) * DAMP;
        ox[i] += vx[i];
        oy[i] += vy[i];
        const disp = Math.abs(ox[i]) + Math.abs(oy[i]);
        if (heat > 0.001 || disp > 0.15) {
          moving = true;
          loose.push(i);
          heats.push(Math.max(heat, Math.min(1, disp / 30)));
        } else {
          ox[i] = oy[i] = vx[i] = vy[i] = 0;
        }
      }

      for (const i of loose) ctx.clearRect(hx[i], hy[i], cell, cell);
      for (let k = 0; k < loose.length; k++) {
        const i = loose[k];
        const heat = heats[k];
        // Thin out toward the pointer
        if (1 - heat * 0.9 < bayer[i]) continue;
        const tint = bayer[i] < 0.5 ? PINK : CYAN;
        const m = Math.min(1, heat * 1.4);
        ctx.fillStyle = `rgb(${TEAL[0] + (tint[0] - TEAL[0]) * m},${TEAL[1] + (tint[1] - TEAL[1]) * m},${TEAL[2] + (tint[2] - TEAL[2]) * m})`;
        const size = heat > 0.05 ? cell - 1 : cell;
        ctx.fillRect(hx[i] + ox[i], hy[i] + oy[i], size, size);
      }
      return moving;
    };

    const loop = () => {
      running = frame() || pointer !== null;
      if (running) raf = requestAnimationFrame(loop);
    };
    const wake = () => {
      if (reduced || running) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };

    const toLocal = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const near = x > -RADIUS && y > -RADIUS && x < rect.width + RADIUS && y < rect.height + RADIUS;
      pointer = near ? { x, y } : null;
      if (near) wake();
    };
    const onLeave = () => {
      pointer = null;
    };

    img.onload = () => {
      layout();
      paint();
    };
    img.src = SRC;

    const ro = new ResizeObserver(() => {
      layout();
      if (img.complete) paint();
    });
    ro.observe(canvas);
    window.addEventListener("pointermove", toLocal, { passive: true });
    canvas.addEventListener("pointerleave", onLeave);
    document.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", toLocal);
      canvas.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <a
      href={href}
      aria-label="Bold"
      className={
        "block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-[var(--gym-cyan)] " +
        (className ?? "")
      }
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className="block w-full aspect-[975/267] touch-pan-y drop-shadow-[0_0_40px_rgba(65,198,166,0.4)]"
      />
    </a>
  );
}
