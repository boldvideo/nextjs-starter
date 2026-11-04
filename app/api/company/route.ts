import { readSite } from "@/lib/asmartbear/site";

// "Add your company": reads the visitor's site into a profile. Nothing is
// stored here; the browser keeps it and sends it with every question.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MESSAGES = {
  invalid: "That doesn't look like a website address.",
  unreachable: "Couldn't reach that site. Check the address, or describe your company instead.",
  empty: "That page didn't say much. Describe your company instead.",
};

// Best-effort per-instance limit: each read is an outbound fetch on our dime.
const hits = new Map<string, { n: number; at: number }>();
function limited(ip: string) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.at > 3_600_000) {
    hits.set(ip, { n: 1, at: now });
    return false;
  }
  h.n += 1;
  return h.n > 20;
}

export async function POST(request: Request) {
  let body: { website?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: MESSAGES.invalid, code: "invalid" }, { status: 400 });
  }
  if (typeof body.website !== "string" || body.website.length > 300) {
    return Response.json({ error: MESSAGES.invalid, code: "invalid" }, { status: 400 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(ip)) {
    return Response.json({ error: "That's a lot of websites. Give it an hour.", code: "busy" }, { status: 429 });
  }
  const result = await readSite(body.website);
  if (!result.ok) {
    return Response.json({ error: MESSAGES[result.error], code: result.error }, { status: result.error === "invalid" ? 400 : 422 });
  }
  return Response.json(result.profile, { headers: { "Cache-Control": "no-store" } });
}
