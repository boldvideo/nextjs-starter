/**
 * One-time HubSpot setup for The GTM Game (idempotent, safe to re-run):
 *   - deal pipeline "The GTM Game" (New player → Engaged → Conversation
 *     booked → Joined FounderWell / Not now)
 *   - active contact list "The GTM Game: players" (GTM Game player = yes)
 *
 *   bun --env-file=.env.local scripts/gtm-game-hubspot-setup.ts
 */
import { hubspot, hubspotScopes, PIPELINE_LABEL, PIPELINE_STAGES } from "@/lib/gym-hubspot";

const LIST_NAME = "The GTM Game: players";
const REQUIRED = ["crm.lists.write", "crm.objects.deals.write", "crm.schemas.deals.write"];

async function json(res: Response) {
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  const scopes = await hubspotScopes();
  const missing = REQUIRED.filter((s) => !scopes.includes(s));
  if (missing.length) throw new Error(`Missing HubSpot scopes: ${missing.join(", ")}`);

  // Pipeline
  const pipelines = await json(await hubspot("/crm/v3/pipelines/deals"));
  let pipeline = pipelines.results.find((p: { label: string }) => p.label === PIPELINE_LABEL);
  if (pipeline) {
    console.log(`✓ pipeline exists: ${pipeline.id}`);
  } else {
    pipeline = await json(
      await hubspot("/crm/v3/pipelines/deals", {
        method: "POST",
        body: JSON.stringify({ label: PIPELINE_LABEL, displayOrder: 99, stages: PIPELINE_STAGES }),
      })
    );
    console.log(`✓ pipeline created: ${pipeline.id}`);
  }
  for (const st of pipeline.stages) console.log(`    ${st.label}: ${st.id}`);

  // List
  const search = await json(
    await hubspot("/crm/v3/lists/search", { method: "POST", body: JSON.stringify({ query: LIST_NAME }) })
  );
  const existing = (search?.lists ?? []).find((l: { name: string }) => l.name === LIST_NAME);
  if (existing) {
    console.log(`✓ list exists: ${existing.listId}`);
  } else {
    const created = await json(
      await hubspot("/crm/v3/lists", {
        method: "POST",
        body: JSON.stringify({
          name: LIST_NAME,
          objectTypeId: "0-1",
          processingType: "DYNAMIC",
          filterBranch: {
            filterBranchType: "OR",
            filters: [],
            filterBranches: [
              {
                filterBranchType: "AND",
                filterBranches: [],
                filters: [
                  {
                    filterType: "PROPERTY",
                    property: "gtm_game_player",
                    operation: { operationType: "ENUMERATION", operator: "IS_ANY_OF", values: ["true"] },
                  },
                ],
              },
            ],
          },
        }),
      })
    );
    console.log(`✓ list created: ${created.list?.listId ?? JSON.stringify(created).slice(0, 200)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
