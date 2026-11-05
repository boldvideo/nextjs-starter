// Plausible custom events. The script and its queue stub come from the portal's
// analytics setting (components/analytics.tsx); without it this is a no-op.
// Props are strings, cut to Plausible's 300-character limit.

type Props = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string> }) => void;
  }
}

export function track(event: string, props: Props = {}) {
  if (typeof window === "undefined" || typeof window.plausible !== "function") return;
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === "") continue;
    clean[k] = String(v).slice(0, 300);
  }
  try {
    window.plausible(event, { props: clean });
  } catch {
    /* analytics never breaks the page */
  }
}
