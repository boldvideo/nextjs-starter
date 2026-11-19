// The visitor's company, for "Add your company": read from their website or
// typed in, kept in this browser (localStorage), and sent with every question
// as Bold's inline viewer_profile. Never stored by Bold. Shared by client and
// server; nothing here touches the network.

export interface CompanyProfile {
  website?: string;
  business_name?: string;
  /** One or two lines: what they sell, to whom (editable) */
  summary?: string;
  /** The site's own words, trimmed */
  business_description?: string;
  mrr?: string;
  churn?: string;
  /** "What's your biggest problem right now?" */
  goal?: string;
  /** Stage in their words, e.g. "finding PMF" */
  stage?: string;
  /** Annual recurring revenue as they type it, e.g. "€2.4M" */
  arr?: string;
  /** Shift AI's two kinds of member: existing SaaS going AI-first, or AI-native from the start */
  kind?: "Transformer" | "Builder";
  /** Buyer / price / motion as read from the site, for display (the full profile is business_description) */
  facts?: { label: string; value: string }[];
  /** The site's icon, for display only (never sent to Bold) */
  icon?: string;
}

// Bold caps an inline viewer_profile value at 2,000 characters.
const LIMITS: Record<string, number> = {
  business_name: 120,
  website: 200,
  business_description: 2000,
  mrr: 60,
  churn: 60,
  goal: 400,
  stage: 120,
};

/** Profile → the viewer_profile keys Bold's prompts know (business_*, mrr, goal) plus churn. */
export function viewerProfile(p: CompanyProfile | null | undefined): Record<string, string> {
  if (!p) return {};
  const description = [p.summary, p.business_description]
    .map((s) => s?.trim())
    .filter((s, i, all): s is string => Boolean(s) && all.indexOf(s) === i)
    .join("\n\n");
  return sanitizeViewerProfile({
    business_name: p.business_name,
    website: p.website,
    business_description: description,
    mrr: p.mrr,
    churn: p.churn,
    goal: p.goal,
    // One line the prompt already knows how to read: "Transformer, finding PMF, €2.4M ARR".
    stage: [p.kind, p.stage?.trim(), p.arr?.trim() ? `${p.arr.trim().replace(/\s*ARR$/i, "")} ARR` : ""].filter(Boolean).join(", "),
  });
}

/** Server and client: keep only known keys, as trimmed, capped strings. */
export function sanitizeViewerProfile(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, string> = {};
  for (const key of Object.keys(LIMITS)) {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value !== "string") continue;
    const trimmed = value.trim().slice(0, LIMITS[key]);
    if (trimmed) out[key] = trimmed;
  }
  return out;
}

export function domainOf(website?: string | null): string | null {
  if (!website) return null;
  try {
    const url = new URL(website.includes("://") ? website : `https://${website}`);
    return url.hostname.includes(".") ? url.hostname.replace(/^www\./, "") : null;
  } catch {
    return null;
  }
}
