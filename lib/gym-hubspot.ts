import "server-only";

import { CONSENT_TEXT, STAGES, type Stage } from "@/lib/gym-lead";

/**
 * FounderWell's HubSpot: every player who inserts a coin becomes (or
 * updates) a contact keyed by email, with a "The GTM Game" property group:
 *
 *   gtm_game_player        yes, for lists and workflows
 *   gtm_game_stage         Pre-revenue / First customers / Scaling
 *   gtm_game_questions     every question, dated, newest last
 *   gtm_game_consent       the exact consent text + timestamp
 *   gtm_game_first_played  when the coin went in
 *
 * Consenting players are also subscribed to the portal's marketing
 * subscription type (HUBSPOT_SUBSCRIPTION_ID, else the first one named
 * "marketing"). Needs a private app token (HUBSPOT_TOKEN) with contacts
 * read/write, contact schemas read/write and communication_preferences.
 * We never touch lifecycle stage or owner: that's FounderWell's call.
 */

const API = "https://api.hubapi.com";
const GROUP = "gtm_game";
const QUESTIONS_MAX = 60000; // textarea limit is 65,536

function token(): string | null {
  return process.env.HUBSPOT_TOKEN || null;
}

async function hubspot(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(10000),
  });
}

const PROPERTIES = [
  {
    name: "gtm_game_player",
    label: "GTM Game player",
    type: "enumeration",
    fieldType: "booleancheckbox",
    options: [
      { label: "Yes", value: "true", displayOrder: 0 },
      { label: "No", value: "false", displayOrder: 1 },
    ],
  },
  {
    name: "gtm_game_stage",
    label: "GTM Game stage",
    type: "enumeration",
    fieldType: "select",
    options: STAGES.map((s, i) => ({ label: s, value: s, displayOrder: i })),
  },
  { name: "gtm_game_questions", label: "GTM Game questions", type: "string", fieldType: "textarea" },
  { name: "gtm_game_consent", label: "GTM Game consent", type: "string", fieldType: "textarea" },
  { name: "gtm_game_first_played", label: "GTM Game first played", type: "datetime", fieldType: "date" },
];

// Once per warm instance; HubSpot answers 409 for anything that exists
let ready: Promise<void> | null = null;

function ensureProperties(): Promise<void> {
  ready ??= (async () => {
    await hubspot("/crm/v3/properties/contacts/groups", {
      method: "POST",
      body: JSON.stringify({ name: GROUP, label: "The GTM Game", displayOrder: -1 }),
    });
    await Promise.all(
      PROPERTIES.map((p) =>
        hubspot("/crm/v3/properties/contacts", {
          method: "POST",
          body: JSON.stringify({ ...p, groupName: GROUP }),
        })
      )
    );
  })().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}

async function upsert(email: string, properties: Record<string, string>) {
  const res = await hubspot("/crm/v3/objects/contacts/batch/upsert", {
    method: "POST",
    body: JSON.stringify({ inputs: [{ id: email, idProperty: "email", properties }] }),
  });
  if (!res.ok) throw new Error(`HubSpot upsert ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

async function current(email: string): Promise<{ questions: string; firstPlayed: string | null }> {
  const res = await hubspot(
    `/crm/v3/objects/contacts/${encodeURIComponent(email)}?idProperty=email&properties=gtm_game_questions,gtm_game_first_played`
  );
  if (!res.ok) return { questions: "", firstPlayed: null };
  const props = (await res.json())?.properties ?? {};
  return { questions: props.gtm_game_questions ?? "", firstPlayed: props.gtm_game_first_played || null };
}

function dated(question: string, at = new Date()): string {
  return `${at.toISOString().slice(0, 10)}: ${question.replace(/\s+/g, " ").trim()}`;
}

function join(before: string, lines: string[]): string {
  const text = [before, ...lines].filter(Boolean).join("\n");
  return text.length > QUESTIONS_MAX ? text.slice(text.length - QUESTIONS_MAX) : text;
}

let subscriptionId: Promise<string | null> | null = null;

function findSubscription(): Promise<string | null> {
  if (process.env.HUBSPOT_SUBSCRIPTION_ID) return Promise.resolve(process.env.HUBSPOT_SUBSCRIPTION_ID);
  subscriptionId ??= hubspot("/communication-preferences/v3/definitions")
    .then((r) => (r.ok ? r.json() : null))
    .then((body) => {
      const defs: { id: string; name: string; isActive?: boolean }[] = body?.subscriptionDefinitions ?? [];
      const active = defs.filter((d) => d.isActive !== false);
      return (active.find((d) => /marketing/i.test(d.name)) ?? null)?.id ?? null;
    })
    .catch(() => null);
  return subscriptionId;
}

async function subscribe(email: string) {
  const id = await findSubscription();
  if (!id) {
    console.info("[gym] hubspot: no marketing subscription type found; contact tagged, not subscribed");
    return;
  }
  const res = await hubspot("/communication-preferences/v3/subscribe", {
    method: "POST",
    body: JSON.stringify({
      emailAddress: email,
      subscriptionId: id,
      legalBasis: "CONSENT_WITH_NOTICE",
      legalBasisExplanation: `Inserted a coin in The GTM Game (play.founderwell.com): "${CONSENT_TEXT}"`,
    }),
  });
  // 400 "already subscribed" is fine
  if (!res.ok && res.status !== 400) console.error(`[gym] hubspot subscribe ${res.status}`);
}

export function hubspotEnabled(): boolean {
  return Boolean(token());
}

export async function hubspotLead(input: {
  email: string;
  stage?: Stage;
  questions: string[];
  consentedAt: string;
}) {
  await ensureProperties();
  const at = new Date(input.consentedAt);
  const before = await current(input.email);
  await upsert(input.email, {
    gtm_game_player: "true",
    ...(input.stage ? { gtm_game_stage: input.stage } : {}),
    gtm_game_questions: join(before.questions, input.questions.map((q) => dated(q, at))),
    gtm_game_consent: `${input.consentedAt}: ${CONSENT_TEXT}`,
    ...(before.firstPlayed ? {} : { gtm_game_first_played: String(at.getTime()) }),
  });
  await subscribe(input.email);
}

export async function hubspotQuestion(email: string, question: string) {
  await ensureProperties();
  const before = await current(email);
  await upsert(email, { gtm_game_questions: join(before.questions, [dated(question)]) });
}
