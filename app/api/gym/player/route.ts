import { after } from "next/server";
import {
  CONSENT_TEXT,
  getPlayer,
  isStage,
  normalizeEmail,
  playerCookie,
  PLAYER_COOKIE_NAME,
  pushLead,
  upsertPlayerViewer,
} from "@/lib/gym-player";

// Insert coin: the email becomes a FounderWell lead and a Bold viewer.
export const dynamic = "force-dynamic";

export async function GET() {
  const player = await getPlayer();
  return Response.json({ player: Boolean(player), email: player?.email ?? null });
}

// Log out: forget the coin (the email) in this browser
export async function DELETE() {
  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": `${PLAYER_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax` },
  });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  if (!email) return Response.json({ error: "That email doesn't look right." }, { status: 400 });
  if (body.consent !== true) return Response.json({ error: "Consent is required." }, { status: 400 });

  const stage = isStage(body.stage) ? body.stage : undefined;
  const questions = Array.isArray(body.questions)
    ? body.questions.filter((q): q is string => typeof q === "string").map((q) => q.trim().slice(0, 500)).filter(Boolean).slice(0, 10)
    : [];
  const consentedAt = new Date().toISOString();

  try {
    const viewer = await upsertPlayerViewer({ email, stage, questions, consentedAt });
    // The CRM push must not hold up the game
    after(() =>
      pushLead({
        event: "lead",
        email,
        stage,
        questions,
        consent: { text: CONSENT_TEXT, at: consentedAt },
        viewerId: viewer.id,
      })
    );
    return new Response(JSON.stringify({ ok: true }), {
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": playerCookie({ viewerId: viewer.id, email }),
      },
    });
  } catch (error) {
    console.error("[gym] insert coin failed", error);
    return Response.json({ error: "The machine jammed. Try again." }, { status: 500 });
  }
}
