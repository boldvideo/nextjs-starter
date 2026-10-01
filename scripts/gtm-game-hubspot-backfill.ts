/**
 * Push every GTM Game player (Bold viewers with lead_source=gtm-game) into
 * FounderWell's HubSpot. Idempotent: run it as often as you like.
 *
 *   bun --env-file=.env.local scripts/gtm-game-hubspot-backfill.ts [--dry]
 */
import { createClient } from "@boldvideo/bold-js";
import { hubspotScopes, hubspotSync } from "@/lib/gym-hubspot";
import { isStage, LEAD_TAG } from "@/lib/gym-lead";

const REQUIRED = [
  "crm.objects.contacts.read",
  "crm.objects.contacts.write",
  "crm.schemas.contacts.read",
  "crm.schemas.contacts.write",
];

async function main() {
  const dry = process.argv.includes("--dry");
  if (!process.env.HUBSPOT_TOKEN || !process.env.BOLD_API_KEY) throw new Error("HUBSPOT_TOKEN and BOLD_API_KEY are required");

  const scopes = await hubspotScopes();
  const missing = REQUIRED.filter((s) => !scopes.includes(s));
  console.log(`HubSpot scopes: ${scopes.join(", ") || "(none)"}`);
  if (missing.length && !dry) throw new Error(`Missing HubSpot scopes: ${missing.join(", ")}`);

  const bold = createClient(process.env.BOLD_API_KEY, {
    baseURL: process.env.BACKEND_URL || "https://app.boldvideo.io/api/v1",
  });
  const { data: viewers } = await bold.viewers.list();
  const players = viewers.filter((v) => (v.traits as Record<string, unknown> | undefined)?.lead_source === LEAD_TAG);
  console.log(`${players.length} players of ${viewers.length} viewers`);

  for (const v of players) {
    const traits = (v.traits ?? {}) as Record<string, unknown>;
    const email = v.email;
    if (!email) continue;
    const questionLines = typeof traits.questions === "string" ? traits.questions.split("\n").filter(Boolean) : [];
    const consentedAt = typeof traits.founderwell_consent_at === "string" ? traits.founderwell_consent_at : undefined;
    if (dry) {
      console.log(`- ${email} · ${traits.stage ?? "no stage"} · ${questionLines.length} questions · consent ${consentedAt ?? "none"}`);
      continue;
    }
    const { added } = await hubspotSync({
      email,
      stage: isStage(traits.stage) ? traits.stage : undefined,
      questionLines,
      consentedAt,
      subscribe: Boolean(consentedAt),
    });
    console.log(`✓ ${email} (+${added} questions)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
