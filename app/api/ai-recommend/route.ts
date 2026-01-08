import { getTenantContext } from "@/lib/get-tenant-context";
import type { AIEvent } from "@boldvideo/bold-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

interface RecommendRequestBody {
  topics: string | string[];
  limit?: number;
  collectionId?: string;
  collection_id?: string;
  tags?: string[];
  includeGuidance?: boolean;
  include_guidance?: boolean;
  synthesize?: boolean;
}

function asyncIterableToStream(iterable: AsyncIterable<AIEvent>): ReadableStream {
  const encoder = new TextEncoder();
  const iterator = iterable[Symbol.asyncIterator]();

  return new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await iterator.next();

        if (done) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify(value)}\n\n`));
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              message: error instanceof Error ? error.message : "Stream error",
            })}\n\n`
          )
        );
        controller.close();
      }
    },
  });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context) {
    return new Response(
      JSON.stringify({ type: "error", code: "TENANT_NOT_FOUND", message: "Tenant not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: RecommendRequestBody;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ type: "error", code: "INVALID_JSON", message: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const {
    topics,
    limit,
    collectionId,
    collection_id,
    tags,
    includeGuidance,
    include_guidance,
    synthesize
  } = body;

  if (!topics || (Array.isArray(topics) && topics.length === 0)) {
    return new Response(
      JSON.stringify({ type: "error", code: "MISSING_TOPICS", message: "Topics are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const effectiveCollectionId = collectionId || collection_id;
  const effectiveIncludeGuidance = includeGuidance ?? include_guidance ?? synthesize ?? true;

  try {
    const stream = await context.client.ai.recommend({
      topics: Array.isArray(topics) ? topics : [topics],
      stream: true,
      limit: limit || 5,
      collectionId: effectiveCollectionId || undefined,
      tags: tags?.length ? tags : undefined,
      includeGuidance: effectiveIncludeGuidance,
    });

    const responseStream = asyncIterableToStream(stream as AsyncIterable<AIEvent>);

    return new Response(responseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        type: "error",
        code: "RECOMMEND_ERROR",
        message: error instanceof Error ? error.message : "Failed to process request",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
