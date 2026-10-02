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
 *   gtm_game_quest*        the last quest a player said they did (text,
 *                          score / target) and its check-in date
 *
 * Consenting players are also subscribed to the portal's marketing
 * subscription type (HUBSPOT_SUBSCRIPTION_ID, else the first one named
 * "marketing"). Needs a private app token (HUBSPOT_TOKEN) with contacts
 * read/write, contact schemas read/write and communication_preferences.
 * We never touch lifecycle stage or owner: that's FounderWell's call.
 * (No "server-only" guard: the backfill script imports this outside Next.
 * The token is a server env var and never reaches a client bundle.)
 */

const API = "https://api.hubapi.com";
const GROUP = "gtm_game";
const QUESTIONS_MAX = 60000; // textarea limit is 65,536

function token(): string | null {
  return process.env.HUBSPOT_TOKEN || null;
}

export async function hubspot(path: string, init: RequestInit = {}): Promise<Response> {
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
  { name: "gtm_game_deal_id", label: "GTM Game deal", type: "string", fieldType: "text" },
  { name: "gtm_game_quest", label: "GTM Game quest", type: "string", fieldType: "textarea" },
  { name: "gtm_game_quest_score", label: "GTM Game quest score", type: "number", fieldType: "number" },
  { name: "gtm_game_quest_target", label: "GTM Game quest target", type: "number", fieldType: "number" },
  { name: "gtm_game_checkin_date", label: "GTM Game check-in date", type: "date", fieldType: "date" },
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

async function upsert(email: string, properties: Record<string, string>): Promise<string | null> {
  const res = await hubspot("/crm/v3/objects/contacts/batch/upsert", {
    method: "POST",
    body: JSON.stringify({ inputs: [{ id: email, idProperty: "email", properties }] }),
  });
  if (!res.ok) throw new Error(`HubSpot upsert ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = await res.json().catch(() => null);
  return body?.results?.[0]?.id ?? null;
}

interface Current {
  questions: string;
  firstPlayed: string | null;
  leadStatus: string | null;
  dealId: string | null;
}

async function current(email: string): Promise<Current> {
  const res = await hubspot(
    `/crm/v3/objects/contacts/${encodeURIComponent(email)}?idProperty=email&properties=gtm_game_questions,gtm_game_first_played,hs_lead_status,gtm_game_deal_id`
  );
  if (!res.ok) return { questions: "", firstPlayed: null, leadStatus: null, dealId: null };
  const props = (await res.json())?.properties ?? {};
  return {
    questions: props.gtm_game_questions ?? "",
    firstPlayed: props.gtm_game_first_played || null,
    leadStatus: props.hs_lead_status || null,
    dealId: props.gtm_game_deal_id || null,
  };
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
  const questions = join(before.questions, input.questions.map((q) => dated(q, at)));
  const contactId = await upsert(input.email, {
    gtm_game_player: "true",
    ...(input.stage ? { gtm_game_stage: input.stage } : {}),
    gtm_game_questions: questions,
    gtm_game_consent: `${input.consentedAt}: ${CONSENT_TEXT}`,
    ...(before.firstPlayed ? {} : { gtm_game_first_played: String(at.getTime()) }),
    // Into the outbound queue, unless someone already works this contact
    ...(before.leadStatus ? {} : { hs_lead_status: "NEW" }),
  });
  await subscribe(input.email);
  if (contactId) await syncDeal({ email: input.email, contactId, dealId: before.dealId, questions, stage: input.stage });
}

export async function hubspotQuestion(email: string, question: string) {
  await ensureProperties();
  const before = await current(email);
  const questions = join(before.questions, [dated(question)]);
  const contactId = await upsert(email, { gtm_game_questions: questions });
  if (contactId) await syncDeal({ email, contactId, dealId: before.dealId, questions });
}

// ── Pipeline: one open deal per player in "The GTM Game" ─────────────────

export const PIPELINE_LABEL = "The GTM Game";
export const PIPELINE_STAGES = [
  { label: "New player", displayOrder: 0, metadata: { probability: "0.1" } },
  { label: "Engaged", displayOrder: 1, metadata: { probability: "0.2" } },
  { label: "Conversation booked", displayOrder: 2, metadata: { probability: "0.4" } },
  { label: "Joined FounderWell", displayOrder: 3, metadata: { isClosed: "true", probability: "1.0" } },
  { label: "Not now", displayOrder: 4, metadata: { isClosed: "true", probability: "0.0" } },
];
/** Questions asked before a deal moves from New player to Engaged. */
const ENGAGED_AT = 4;

interface Pipeline {
  id: string;
  stages: Record<string, string>;
}

let pipeline: Promise<Pipeline | null> | null = null;

/** The pipeline by label (created by scripts/gtm-game-hubspot-setup.ts). */
function findPipeline(): Promise<Pipeline | null> {
  pipeline ??= hubspot("/crm/v3/pipelines/deals")
    .then(async (r) => {
      if (!r.ok) {
        if (r.status === 403) console.info("[gym] hubspot: no deal scopes; skipping the pipeline");
        return null;
      }
      const found = ((await r.json())?.results ?? []).find((p: { label: string }) => p.label === PIPELINE_LABEL);
      if (!found) return null;
      const stages: Record<string, string> = {};
      for (const st of found.stages ?? []) stages[st.label] = st.id;
      return { id: found.id as string, stages };
    })
    .catch(() => null);
  return pipeline.then((p) => {
    if (!p) pipeline = null; // look again next time (scopes or setup may land)
    return p;
  });
}

function dealDescription(questions: string): string {
  return `Questions from The GTM Game (play.founderwell.com), oldest first:\n${questions}`.slice(0, 60000);
}

async function syncDeal(input: { email: string; contactId: string; dealId: string | null; questions: string; stage?: Stage }) {
  const p = await findPipeline();
  if (!p) return;
  const count = input.questions.split("\n").filter(Boolean).length;

  if (input.dealId) {
    const res = await hubspot(`/crm/v3/objects/deals/${input.dealId}?properties=dealstage,hs_is_closed`);
    if (res.ok) {
      const deal = (await res.json())?.properties ?? {};
      if (deal.hs_is_closed !== "true") {
        const moveToEngaged = deal.dealstage === p.stages["New player"] && count >= ENGAGED_AT && p.stages["Engaged"];
        await hubspot(`/crm/v3/objects/deals/${input.dealId}`, {
          method: "PATCH",
          body: JSON.stringify({
            properties: { description: dealDescription(input.questions), ...(moveToEngaged ? { dealstage: p.stages["Engaged"] } : {}) },
          }),
        });
        return;
      }
    }
    // Closed or gone: a new run starts a new deal
  }

  const res = await hubspot("/crm/v3/objects/deals", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        dealname: `${input.email} · The GTM Game`,
        pipeline: p.id,
        dealstage: count >= ENGAGED_AT ? p.stages["Engaged"] : p.stages["New player"],
        description: dealDescription(input.questions),
      },
      // 3 = deal → contact
      associations: [{ to: { id: input.contactId }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }] }],
    }),
  });
  if (!res.ok) {
    console.error(`[gym] hubspot deal create ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return;
  }
  const deal = await res.json();
  await upsert(input.email, { gtm_game_deal_id: String(deal.id) });
}

/**
 * Bring a contact in line with the player's Bold viewer (the source of
 * truth): adds any question lines HubSpot doesn't have yet, so re-running
 * never duplicates. Used by scripts/gtm-game-hubspot-backfill.ts.
 */
export async function hubspotSync(input: {
  email: string;
  stage?: Stage;
  questionLines: string[];
  consentedAt?: string;
  subscribe: boolean;
}): Promise<{ added: number }> {
  await ensureProperties();
  const before = await current(input.email);
  const have = new Set(before.questions.split("\n").filter(Boolean));
  const missing = input.questionLines.filter((l) => !have.has(l));
  const questions = missing.length ? join(before.questions, missing) : before.questions;
  const contactId = await upsert(input.email, {
    gtm_game_player: "true",
    ...(input.stage ? { gtm_game_stage: input.stage } : {}),
    ...(missing.length ? { gtm_game_questions: questions } : {}),
    ...(before.leadStatus ? {} : { hs_lead_status: "NEW" }),
    ...(input.consentedAt ? { gtm_game_consent: `${input.consentedAt}: ${CONSENT_TEXT}` } : {}),
    ...(before.firstPlayed || !input.consentedAt ? {} : { gtm_game_first_played: String(Date.parse(input.consentedAt)) }),
  });
  if (input.subscribe) await subscribe(input.email);
  if (contactId) await syncDeal({ email: input.email, contactId, dealId: before.dealId, questions, stage: input.stage });
  return { added: missing.length };
}

/** The scopes the token actually has (to tell "missing scope" from "broken"). */
export async function hubspotScopes(): Promise<string[]> {
  const res = await fetch(`${API}/oauth/v2/private-apps/get/access-token-info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tokenKey: token() }),
  });
  return res.ok ? ((await res.json()).scopes ?? []) : [];
}

// ── Quest check-in: "I did it" → a task for FounderWell in 7 days ─────────

const CHECKIN_DAYS = 7;

async function ownerOf(path: string): Promise<string | null> {
  const res = await hubspot(`${path}?properties=hubspot_owner_id`);
  if (!res.ok) return null;
  return (await res.json())?.properties?.hubspot_owner_id || null;
}

/**
 * The player finished a quest and asked for a check-in. Records the quest on
 * the contact and creates a HubSpot task due in 7 days, associated to the
 * contact (and the GTM Game deal), owned by whoever owns the deal or contact.
 * No email goes out: a person checks in. Returns the task id.
 */
export async function hubspotCheckin(input: {
  email: string;
  quest: string;
  score?: number | null;
  target?: number | null;
  link?: string | null;
}): Promise<string> {
  await ensureProperties();
  const before = await current(input.email);
  const due = new Date(Date.now() + CHECKIN_DAYS * 86400000);
  const dueDate = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  const hasScore = typeof input.score === "number" && Number.isFinite(input.score);
  const hasTarget = typeof input.target === "number" && Number.isFinite(input.target);
  const contactId = await upsert(input.email, {
    gtm_game_quest: input.quest.slice(0, 5000),
    ...(hasScore ? { gtm_game_quest_score: String(input.score) } : {}),
    ...(hasTarget ? { gtm_game_quest_target: String(input.target) } : {}),
    gtm_game_checkin_date: String(dueDate),
  });
  if (!contactId) throw new Error("HubSpot check-in: no contact id");

  const owner =
    (before.dealId ? await ownerOf(`/crm/v3/objects/deals/${before.dealId}`) : null) ??
    (await ownerOf(`/crm/v3/objects/contacts/${contactId}`));

  const score = hasScore ? `${input.score}${hasTarget ? ` / ${input.target}` : ""}` : "not given";
  const body = [
    `${input.email} finished a quest in The GTM Game and asked for a check-in.`,
    ``,
    `Quest: ${input.quest}`,
    `Their score: ${score}`,
    input.link ? `The game: ${input.link}` : "",
    ``,
    `Ask how it went and what got in the way.`,
  ]
    .filter((l, i, all) => l || all[i - 1])
    .join("\n");

  const associations = [
    // 204 = task → contact, 216 = task → deal
    { to: { id: contactId }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 204 }] },
    ...(before.dealId
      ? [{ to: { id: before.dealId }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 216 }] }]
      : []),
  ];
  const res = await hubspot("/crm/v3/objects/tasks", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        hs_timestamp: due.toISOString(),
        hs_task_subject: `GTM Game check-in: ${input.email}`,
        hs_task_body: body,
        hs_task_status: "NOT_STARTED",
        hs_task_priority: "MEDIUM",
        hs_task_type: "EMAIL",
        ...(owner ? { hubspot_owner_id: owner } : {}),
      },
      associations,
    }),
  });
  if (!res.ok) throw new Error(`HubSpot task ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return String((await res.json()).id);
}
