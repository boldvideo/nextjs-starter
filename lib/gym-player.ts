import "server-only";

import { cookies } from "next/headers";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import type { Viewer } from "@boldvideo/bold-js";
import { getTenantContext } from "@/lib/get-tenant-context";
import { CONSENT_TEXT, isStage, LEAD_TAG, STAGES, type Stage } from "@/lib/gym-lead";
import { hubspotEnabled, hubspotLead, hubspotQuestion } from "@/lib/gym-hubspot";

export { CONSENT_TEXT, isStage, LEAD_TAG, STAGES, type Stage };

/**
 * Players who inserted a coin (their email) without signing in. The email
 * belongs to FounderWell: it becomes a Bold viewer on the tenant (so every
 * later question is attached to them) and is pushed to FounderWell's CRM
 * through a webhook, tagged, with the questions they asked before the coin.
 * Bold never reuses it.
 *
 * The player is remembered in an httpOnly cookie signed with HMAC, so the
 * server can trust "this browser is viewer X" without a database.
 */

const PLAYER_COOKIE = "gym_player";
const MAX_AGE = 60 * 60 * 24 * 365;

function key(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET || process.env.BOLD_API_KEY;
  if (!secret) throw new Error("No secret available for player cookies");
  return createHash("sha256").update(`gym-player:v1:${secret}`).digest();
}

function sign(payload: string): string {
  return createHmac("sha256", key()).update(payload).digest("base64url");
}

export interface Player {
  viewerId: string;
  email: string;
}

/** The player behind this browser's cookie, or null. */
export async function getPlayer(): Promise<Player | null> {
  const raw = (await cookies()).get(PLAYER_COOKIE)?.value;
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { v, e } = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return typeof v === "string" && typeof e === "string" ? { viewerId: v, email: e } : null;
  } catch {
    return null;
  }
}

export function playerCookie(player: Player): string {
  const body = Buffer.from(JSON.stringify({ v: player.viewerId, e: player.email })).toString("base64url");
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${PLAYER_COOKIE}=${body}.${sign(body)}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; SameSite=Lax${secure}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

/**
 * Find or create the player's Bold viewer and merge the lead traits onto it
 * (traits are replaced wholesale by the API, so merge onto what's there).
 */
export async function upsertPlayerViewer(input: {
  email: string;
  stage?: Stage;
  questions: string[];
  consentedAt: string;
}): Promise<Viewer> {
  const context = await getTenantContext();
  if (!context) throw new Error("Tenant not found");
  const { viewers } = context.client;
  const { email } = input;

  const found = await viewers.lookup({ email }).then((r) => r.data).catch(() => null);
  const viewer: Viewer =
    found ??
    (await viewers.create({ name: email, email, externalId: `gym:${email}`, traits: {} }).then((r) => r.data));

  const traits: Record<string, unknown> = { ...(viewer.traits ?? {}) };
  traits.lead_source = LEAD_TAG;
  traits.founderwell_consent_at = input.consentedAt;
  if (input.stage) traits.stage = input.stage;
  if (input.questions.length) {
    const before = typeof traits.first_questions === "string" ? traits.first_questions : "";
    traits.first_questions = [before, ...input.questions].filter(Boolean).join("\n").slice(0, 4000);
  }
  const { data } = await viewers.update(viewer.id, { name: viewer.name || email, traits });
  return data;
}

export type LeadEvent =
  | {
      event: "lead";
      email: string;
      stage?: Stage;
      questions: string[];
      consent: { text: string; at: string };
    }
  | { event: "question"; email: string; question: string; conversationId?: string };

/**
 * Push to FounderWell's CRM: HubSpot when HUBSPOT_TOKEN is set (see
 * lib/gym-hubspot.ts), and/or a generic FOUNDERWELL_LEAD_WEBHOOK_URL
 * (Zapier/Make). Neither = skipped (logged). Never throws.
 */
export async function pushLead(payload: LeadEvent & { viewerId?: string }): Promise<void> {
  if (hubspotEnabled()) {
    try {
      if (payload.event === "lead") {
        await hubspotLead({ email: payload.email, stage: payload.stage, questions: payload.questions, consentedAt: payload.consent.at });
      } else {
        await hubspotQuestion(payload.email, payload.question);
      }
    } catch (error) {
      console.error(`[gym] hubspot ${payload.event} failed`, error);
    }
  }

  const url = process.env.FOUNDERWELL_LEAD_WEBHOOK_URL;
  if (!url) {
    if (!hubspotEnabled()) console.info(`[gym] no CRM configured; skipped ${payload.event}`);
    return;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, tag: LEAD_TAG, source: "play.founderwell.com", at: new Date().toISOString() }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error(`[gym] lead webhook ${payload.event} failed: ${res.status}`);
  } catch (error) {
    console.error(`[gym] lead webhook ${payload.event} failed`, error);
  }
}
