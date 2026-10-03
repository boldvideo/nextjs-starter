import { after } from "next/server";
import type { AIEvent, Segment } from "@boldvideo/bold-js";
import { getTenantContext } from "@/lib/get-tenant-context";
import { portalClient } from "@/lib/portal-client";
import { getMember, memberCookie } from "@/lib/gym-ownership";
import { getMemberViewerId } from "@/lib/gym-viewer";
import { getPlayer, pushLead, recordPlayerQuestion } from "@/lib/gym-player";
import { guessKind, isRoastKind, PITCH_MAX, PITCH_MIN, roastPrompt } from "@/lib/gym-roast";
import { aiGuard } from "@/lib/gym-guard";

/**
 * POST /api/gym/roast { pitch, kind? } → SSE: start (conversation id), text,
 * done (content + sources), error. The roast is a Bold conversation like any
 * level: the result page (/roast/<id>) reads it back, and a player who
 * inserted a coin sends it to FounderWell's CRM as a question.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function source(s: Segment) {
  return {
    id: s.id,
    videoId: s.videoId,
    playbackId: s.playbackId,
    title: s.title,
    startMs: Math.round((s.timestamp ?? 0) * 1000),
    endMs: Math.round((s.timestampEnd ?? s.timestamp ?? 0) * 1000),
    text: s.text,
  };
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const pitch = typeof body.pitch === "string" ? body.pitch.trim() : "";
  if (pitch.length < PITCH_MIN) return Response.json({ error: "Paste a little more: at least a sentence." }, { status: 400 });
  if (pitch.length > PITCH_MAX) return Response.json({ error: "That's a novel. Keep it under 2,000 characters." }, { status: 400 });
  const kind = isRoastKind(body.kind) ? body.kind : guessKind(pitch);

  const blocked = await aiGuard(request, "roast");
  if (blocked) return blocked;

  const context = await getTenantContext();
  if (!context) return Response.json({ error: "Tenant not found" }, { status: 404 });

  const member = await getMember();
  const player = await getPlayer();
  const viewer = (await getMemberViewerId()) ?? player?.viewerId ?? null;
  if (player) {
    const question = `Roast my pitch: ${pitch}`.slice(0, 500);
    after(async () => {
      await recordPlayerQuestion(player.viewerId, question);
      await pushLead({ event: "question", email: player.email, question, viewerId: player.viewerId });
    });
  }

  let stream: AsyncIterable<AIEvent>;
  try {
    stream = (await context.client.ai.ask({
      ...portalClient,
      prompt: roastPrompt(kind, pitch),
      stream: true,
      ...(viewer ? { viewer } : {}),
    } as Parameters<typeof context.client.ai.ask>[0])) as AsyncIterable<AIEvent>;
  } catch (error) {
    console.error("[roast] ask failed", error);
    return Response.json({ error: "The roaster jammed. Try again." }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const send = (controller: ReadableStreamDefaultController<Uint8Array>, data: unknown) =>
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

  const body$ = new ReadableStream<Uint8Array>({
    async start(controller) {
      let text = "";
      let id: string | undefined;
      let sources: Segment[] = [];
      try {
        for await (const event of stream) {
          if (event.type === "message_start") {
            id = event.conversationId;
            send(controller, { type: "start", id });
          } else if (event.type === "text_delta") {
            text += event.delta;
            send(controller, { type: "text", delta: event.delta });
          } else if (event.type === "sources") {
            sources = event.sources;
          } else if (event.type === "message_complete") {
            id = event.conversationId || id;
            send(controller, {
              type: "done",
              id,
              content: event.content || text,
              sources: (event.citations || sources).map(source),
            });
          } else if (event.type === "error") {
            send(controller, { type: "error", message: event.message || "The roaster jammed. Try again." });
          }
        }
      } catch (error) {
        console.error("[roast] stream failed", error);
        send(controller, { type: "error", message: "The roaster jammed. Try again." });
      }
      controller.close();
    },
  });

  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
  });
  const cookie = memberCookie(member);
  if (cookie) headers.append("Set-Cookie", cookie);
  return new Response(body$, { headers });
}
