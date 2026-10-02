/**
 * Challenge links for the daily run: "beat my score" without the code.
 *
 *   /beat/4200?by=MF   the link people share (unfurls with its own card)
 *   → /?play=daily&beat=4200&by=MF   opens today's daily run with an
 *                                    invitation instead of the Konami code
 */

export interface Challenge {
  beat: number;
  by: string | null;
}

const MAX_SCORE = 10_000_000;

/** Initials as the cabinet shows them: up to 3 letters, A-Z only. */
export function cleanInitials(value: string | null | undefined): string | null {
  const v = (value ?? "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
  return v || null;
}

export function cleanScore(value: string | number | null | undefined): number | null {
  const n = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) && n > 0 && n <= MAX_SCORE ? Math.floor(n) : null;
}

export function readChallenge(params: URLSearchParams): Challenge | null {
  const beat = cleanScore(params.get("beat"));
  return beat ? { beat, by: cleanInitials(params.get("by")) } : null;
}

/** The short link to share: /beat/4200?by=MF */
export function challengePath(score: number, by?: string | null): string {
  const initials = cleanInitials(by);
  return `/beat/${Math.floor(score)}${initials ? `?by=${initials}` : ""}`;
}

/** Where a challenge link lands: today's daily run, invitation attached. */
export function challengeLanding(c: Challenge): string {
  return `/?play=daily&beat=${c.beat}${c.by ? `&by=${c.by}` : ""}`;
}

/** "$4,200" */
export function pipeline(score: number): string {
  return `$${Math.floor(score).toLocaleString("en-US")}`;
}
