/**
 * The FounderWell lead, shared by the coin form (client) and the player
 * API (server). The consent text is stored with every lead, word for word.
 */

export const STAGES = ["Pre-revenue", "First customers", "Scaling"] as const;
export type Stage = (typeof STAGES)[number];

export function isStage(value: unknown): value is Stage {
  return typeof value === "string" && (STAGES as readonly string[]).includes(value);
}

export const LEAD_TAG = "gtm-game";

export const CONSENT_TEXT =
  "By inserting a coin you agree that FounderWell may email you about The GTM Game and its programs. Unsubscribe anytime.";

export const FOUNDERWELL_PRIVACY_URL = "https://app.founderwell.com/privacy";
