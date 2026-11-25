import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Social cards: 1200×630, in each edition's own dialect. */
export const OG_SIZE = { width: 1200, height: 630 };

const dir = join(process.cwd(), "assets/og");

const cache = new Map<string, Promise<Buffer>>();
function file(name: string): Promise<Buffer> {
  if (!cache.has(name)) cache.set(name, readFile(join(dir, name)));
  return cache.get(name)!;
}

export async function dataUri(name: string): Promise<string> {
  const buf = await file(name);
  const type = name.endsWith(".png") ? "image/png" : "image/jpeg";
  return `data:${type};base64,${buf.toString("base64")}`;
}

/** A speaker portrait, or null when we have none. */
export async function speakerPhoto(slug: string): Promise<string | null> {
  try {
    return await dataUri(`speakers/${slug}.jpg`);
  } catch {
    return null;
  }
}

type FontSpec = { name: string; data: Buffer; weight: 200 | 300 | 400 | 500 | 700 | 800; style: "normal" | "italic" };

export async function fonts(): Promise<FontSpec[]> {
  const [bricoCond, brico, fraIt, fra, pop, eco, salt] = await Promise.all([
    file("bricolage-800-cond.ttf"),
    file("bricolage-500.ttf"),
    file("fraunces-300-italic.ttf"),
    file("fraunces-300.ttf"),
    file("poppins-200.ttf"),
    file("economica-700.ttf"),
    file("rocksalt.ttf"),
  ]);
  return [
    { name: "BricolageCond", data: bricoCond, weight: 800, style: "normal" },
    { name: "Bricolage", data: brico, weight: 500, style: "normal" },
    { name: "Fraunces", data: fraIt, weight: 300, style: "italic" },
    { name: "Fraunces", data: fra, weight: 300, style: "normal" },
    { name: "Poppins", data: pop, weight: 200, style: "normal" },
    { name: "Economica", data: eco, weight: 700, style: "normal" },
    { name: "RockSalt", data: salt, weight: 400, style: "normal" },
  ];
}

export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
