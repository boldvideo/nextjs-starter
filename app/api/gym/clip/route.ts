import { NextResponse } from "next/server";
import { resolveClip } from "@/lib/gym-clip";

/**
 * GET /api/gym/clip?v=<videoId>&s=<citedStartMs>&e=<citedEndMs>
 * The clip window around a cited moment. The server picks the window from the
 * transcript; callers only say which moment was cited.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const videoRef = url.searchParams.get("v") ?? "";
  const s = Number(url.searchParams.get("s"));
  const e = Number(url.searchParams.get("e") ?? s);
  if (!/^[\w-]{3,64}$/.test(videoRef) || !Number.isFinite(s) || s < 0) {
    return NextResponse.json({ error: "Pass a video id (v) and the cited start in ms (s)." }, { status: 400 });
  }

  const clip = await resolveClip(videoRef, s / 1000, Math.max(s, Number.isFinite(e) ? e : s) / 1000);
  if (!clip) return NextResponse.json({ error: "Session not found." }, { status: 404 });

  // Deterministic per moment: cache at the edge for a day
  return NextResponse.json(clip, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
