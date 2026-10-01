import { getMember } from "@/lib/gym-viewer";
import { getPlayer, isStage } from "@/lib/gym-player";
import { scout } from "@/lib/gym-dodger";

// The player's own objections, scouted by the coach. Personal, never cached.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const business = typeof body.business === "string" ? body.business.trim().slice(0, 400) : "";
  const stage = isStage(body.stage) ? body.stage : undefined;

  // Who's asking: the signed-in member, else the player who inserted a coin
  const member = await getMember();
  const viewer = member?.viewer.id ?? (await getPlayer())?.viewerId ?? null;
  const traits = (member?.viewer.traits ?? {}) as Record<string, unknown>;
  const known = typeof traits.business_name === "string" ? traits.business_name : null;
  const hasProfile = typeof traits.business_description === "string" || Boolean(known);

  // Nothing to go on: the house objections stay
  if (!business && !hasProfile) return Response.json({ personalized: false });

  try {
    const scouted = await scout({
      business: business || undefined,
      stage,
      viewer,
      label: business ? shorten(business) : known,
    });
    if (!scouted) return Response.json({ personalized: false });
    return Response.json({ personalized: true, ...scouted });
  } catch (error) {
    console.error("[dodger] scouting failed", error);
    return Response.json({ personalized: false, error: "The scout got lost. Playing the house set." });
  }
}

/** A label that fits the deck: whole words, 40 characters at most. */
function shorten(text: string): string {
  if (text.length <= 40) return text;
  return `${text.slice(0, 40).replace(/\s+\S*$/, "")}…`;
}
