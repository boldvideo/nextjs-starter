import { normalizeEmail } from "@/lib/gym-player";
import { loopsEnabled, submitChannel } from "@/lib/bold-loops";

// "Send us your channel": Bold's lead, into Bold's Loops list.
export const dynamic = "force-dynamic";

function normalizeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw || raw.length > 500) return null;
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return url.hostname.includes(".") ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  // Honeypot: bots fill every field
  if (typeof body.website === "string" && body.website) return Response.json({ ok: true });

  const email = normalizeEmail(body.email);
  const channelUrl = normalizeUrl(body.channel);
  if (!channelUrl) return Response.json({ error: "Add a link to your channel or library." }, { status: 400 });
  if (!email) return Response.json({ error: "That email doesn't look right." }, { status: 400 });
  if (body.consent !== true) return Response.json({ error: "Consent is required." }, { status: 400 });

  if (!loopsEnabled()) {
    console.error("[bold] LOOPS_API_KEY not set; channel submission dropped", { channelUrl });
    return Response.json({ error: "Our inbox is offline. Email support@boldvideo.com instead." }, { status: 503 });
  }

  try {
    await submitChannel({ email, channelUrl, consentedAt: new Date().toISOString() });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[bold] channel submission failed", error);
    return Response.json({ error: "Something broke. Email support@boldvideo.com instead." }, { status: 500 });
  }
}
