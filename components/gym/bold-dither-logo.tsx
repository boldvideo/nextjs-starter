"use client";

import { useEffect, useRef } from "react";

/**
 * Bold's wordmark as a CRT pixel field: the logo is sampled into a grid of
 * cells and drawn through a 4x4 Bayer dither. At rest it's a sparse, dithered
 * teal; near the pointer the cells fill in to solid and turn hot. Without a
 * mouse (touch, idle) a light sweeps across on its own. Reduced motion gets
 * the static dither. Only animates while on screen.
 */

const SRC = "/bold-logo.svg";
const RATIO = 267 / 975;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const REST = 0.34; // dither density away from the pointer
const RADIUS = 220; // px of influence around the pointer
const TEAL = [65, 198, 166];
const HOT = [214, 255, 244];

export function BoldDitherLogo({ href, className }: { href: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let mask: Uint8Array = new Uint8Array();
    let cols = 0;
    let rows = 0;
    let cell = 6;
    let width = 0;
    let height = 0;
    let pointer: { x: number; y: number } | null = null;
    let lastMove = 0;
    let visible = false;
    let raf = 0;
    const img = new Image();

    const layout = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.width * RATIO;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = width < 640 ? 4 : width < 1000 ? 5 : 6;
      cols = Math.floor(width / cell);
      rows = Math.floor(height / cell);
      if (!img.complete || !cols || !rows) return;
      // Sample the logo once per size: one byte per cell, inside or not
      const off = document.createElement("canvas");
      off.width = cols;
      off.height = rows;
      const octx = off.getContext("2d");
      if (!octx) return;
      octx.drawImage(img, 0, 0, cols, rows);
      const data = octx.getImageData(0, 0, cols, rows).data;
      mask = new Uint8Array(cols * rows);
      for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] > 110 ? 1 : 0;
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      // The light: the pointer, or a slow sweep when there isn't one
      let lx: number | null = null;
      let ly = height * 0.5;
      if (pointer && t - lastMove < 2500) {
        lx = pointer.x;
        ly = pointer.y;
      } else if (!reduced) {
        lx = width * (0.5 + 0.55 * Math.sin(t / 2600));
      }
      const gap = cell > 4 ? 1 : 0.5;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (!mask[y * cols + x]) continue;
          const cx = x * cell + cell / 2;
          const cy = y * cell + cell / 2;
          let heat = 0;
          if (lx !== null) {
            const d = Math.hypot(cx - lx, (cy - ly) * 1.15);
            heat = Math.max(0, 1 - d / RADIUS);
            heat = heat * heat * (3 - 2 * heat);
          }
          const level = REST + (1 - REST) * heat;
          if (level < BAYER[(y % 4) * 4 + (x % 4)]) continue;
          const k = heat * 0.85;
          ctx.fillStyle = `rgb(${TEAL[0] + (HOT[0] - TEAL[0]) * k},${TEAL[1] + (HOT[1] - TEAL[1]) * k},${TEAL[2] + (HOT[2] - TEAL[2]) * k})`;
          ctx.fillRect(x * cell, y * cell, cell - gap, cell - gap);
        }
      }
    };

    const loop = (t: number) => {
      draw(t);
      if (visible && !reduced) raf = requestAnimationFrame(loop);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const rect = canvas.getBoundingClientRect();
      pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      lastMove = performance.now();
    };

    img.onload = () => {
      layout();
      start();
    };
    img.src = SRC;

    const ro = new ResizeObserver(() => {
      layout();
      start();
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    });
    io.observe(canvas);
    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
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
        className="block w-full aspect-[975/267] drop-shadow-[0_0_36px_rgba(65,198,166,0.35)]"
      />
    </a>
  );
}
