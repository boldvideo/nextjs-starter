import { getPlayer } from "@/lib/gym-player";
import { getSessionUser } from "@/lib/gym-viewer";
import { hubspotCheckin, hubspotEnabled } from "@/lib/gym-hubspot";
import { GYM_BASE_URL } from "@/lib/gym-meta";

/**
 * POST /api/gym/checkin { quest, score?, target?, conversationId? }
 * "I did it" → FounderWell checks in in 7 days (a HubSpot task, no email).
 * Needs a known player: the coin cookie or a signed-in member. 401 tells the
 * client to show the coin gate first. CRM trouble never fails the player:
 * the answer is still ok, with `recorded: false`.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const quest = typeof body.quest === "string" ? body.quest.replace(/\s+/g, " ").trim().slice(0, 1000) : "";
  if (!quest) return Response.json({ error: "Missing quest" }, { status: 400 });
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 10000 ? Math.round(v) : null);
  const score = num(body.score);
  const target = num(body.target);
  const conversationId = typeof body.conversationId === "string" && /^[\w-]{8,64}$/.test(body.conversationId) ? body.conversationId : null;

  const email = (await getPlayer())?.email ?? (await getSessionUser())?.email?.toLowerCase() ?? null;
  if (!email) return Response.json({ needsCoin: true }, { status: 401 });

  if (!hubspotEnabled()) {
    console.info("[gym] check-in: no HubSpot configured; skipped", { quest });
    return Response.json({ ok: true, recorded: false });
  }
  try {
    const taskId = await hubspotCheckin({
      email,
      quest,
      score,
      target,
      link: conversationId ? `${GYM_BASE_URL}/ask/${conversationId}` : null,
    });
    return Response.json({ ok: true, recorded: true, taskId });
  } catch (error) {
    console.error("[gym] check-in failed", error);
    return Response.json({ ok: true, recorded: false });
  }
}
