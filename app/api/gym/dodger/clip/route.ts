import type { NextRequest } from "next/server";
import { findClip } from "@/lib/gym-dodger";

// The coach's moment for a line. Same question, same clip: cached at the edge.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().slice(0, 200);
  if (!q) return Response.json({ error: "Missing q" }, { status: 400 });
  try {
    const clip = await findClip(q);
    return Response.json(
      { clip },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
    );
  } catch (error) {
    console.error("[dodger] clip search failed", error);
    return Response.json({ clip: null });
  }
}
