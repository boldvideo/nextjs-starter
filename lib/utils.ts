import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Pick n random items (Fisher–Yates partial shuffle, input untouched).
 */
export function pickRandom<T>(items: T[], n: number): T[] {
  const a = [...items];
  const count = Math.min(n, a.length);
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(Math.random() * (a.length - i));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, count);
}

/**
 * "Ask Anton" label that doesn't double the verb when the configured AI name
 * already starts with "Ask".
 */
export function askLabel(name: string): string {
  return /^ask\b/i.test(name.trim()) ? name : `Ask ${name}`;
}

/**
 * Video tags arrive from the API as objects ({ id, name, slug }) even though
 * the SDK types them as string[]. Normalize either shape to display names.
 */
export function getTagNames(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((t) => {
      if (typeof t === "string") return t;
      if (t && typeof t === "object") {
        const o = t as { name?: string; slug?: string };
        return o.name || o.slug || "";
      }
      return "";
    })
    .filter(Boolean);
}

/**
 * Formats seconds into MM:SS format
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
