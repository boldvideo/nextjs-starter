// Shared by server and client: "45:32" <-> seconds.

export function stampToSeconds(at?: string | null): number | null {
  if (!at) return null;
  const parts = at.split(":").map(Number);
  if (parts.some(Number.isNaN)) return null;
  return parts.reduce((t, n) => t * 60 + n, 0);
}

export function formatStamp(s: number): string {
  const t = Math.floor(s);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}
