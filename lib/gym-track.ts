/**
 * Plausible custom events for the funnel. Pageviews come from the script in
 * the layout; these mark the moments that matter. Add each name as a goal in
 * Plausible (Site settings → Goals → Custom event) to see it in the dashboard.
 */

export type GymEvent =
  | "Level asked"
  | "Coin gate shown"
  | "Coin inserted"
  | "Quest complete"
  | "Share"
  | "Strategy guide"
  | "Clip played"
  | "Stage picked"
  | "Channel submitted"
  | "Konami"
  | "Dodger run"
  | "Dodger over"
  | "Dodger boss"
  | "Dodger scouted"
  | "Dodger share";

type Plausible = (event: string, options?: { props?: Record<string, string | number> }) => void;

export function track(event: GymEvent, props?: Record<string, string | number>) {
  if (typeof window === "undefined") return;
  const plausible = (window as unknown as { plausible?: Plausible }).plausible;
  try {
    plausible?.(event, props ? { props } : undefined);
  } catch {
    /* analytics never breaks the game */
  }
}
