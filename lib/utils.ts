import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
 * Upload URLs from the API may be relative or point at stale hosts.
 * Normalize them to the uploads bucket.
 */
export function fixUploadUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("uploads/")) {
    return `https://uploads.eu1.boldvideo.io/${url}`;
  }
  if (url.startsWith("/uploads/")) {
    return `https://uploads.eu1.boldvideo.io${url}`;
  }
  if (url.includes("/uploads/")) {
    return url.replace(
      /^https?:\/\/[^/]+\/uploads\//,
      "https://uploads.eu1.boldvideo.io/uploads/"
    );
  }
  return url;
}

/**
 * Formats seconds into MM:SS format
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
