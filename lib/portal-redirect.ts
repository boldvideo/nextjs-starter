export function getSafeRedirect(raw?: string | null): string {
  if (!raw) return "/";

  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";

  return raw;
}
