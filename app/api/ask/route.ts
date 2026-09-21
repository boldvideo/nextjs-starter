import { streamAIQuestion } from "../../../lib/ai-question";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for web search support

interface QuestionBody {
  question: string;
  videoId: string;
  subdomain: string;
  conversationId?: string | null;
}

interface ActionBody {
  type: "action";
  value: string;
  label: string;
  id: string;
  conversation_id?: string | null;
}

/** A conversation id is either absent, null (first turn), or a string. */
function isOptionalId(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "string";
}

/**
 * Validates the request body for regular questions
 */
function validateQuestionBody(body: unknown): body is QuestionBody {
  const b = body as Record<string, unknown>;
  return (
    typeof b.question === "string" &&
    typeof b.videoId === "string" &&
    typeof b.subdomain === "string" &&
    isOptionalId(b.conversationId)
  );
}

/**
 * Validates the request body for action requests
 */
function validateActionBody(body: unknown): body is ActionBody {
  const b = body as Record<string, unknown>;
  return (
    b.type === "action" &&
    typeof b.value === "string" &&
    typeof b.label === "string" &&
    typeof b.id === "string" &&
    isOptionalId(b.conversation_id)
  );
}

/**
 * The chat UI reads `message`; older clients read `content`. Send both so a
 * failure never degrades to a generic "Failed to initialize stream".
 */
function errorResponse(
  message: string,
  status: number,
  code?: string,
  detail?: string
) {
  return new Response(
    JSON.stringify({ type: "error", message, content: message, code, detail }),
    {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    }
  );
}

/**
 * The widget is customer-facing, so show a readable sentence. The raw upstream
 * error still reaches the server log and the `detail` field.
 */
function readableMessage(error: unknown, upstreamStatus?: number): string {
  if (upstreamStatus === 404) {
    return "This video's assistant isn't available. It may have been unpublished or is still processing.";
  }
  if (upstreamStatus === 401 || upstreamStatus === 403) {
    return "The assistant isn't authorized for this video. Please contact support.";
  }
  if (upstreamStatus === 429) {
    return "Too many questions at once. Please wait a moment and try again.";
  }
  if (typeof upstreamStatus === "number" && upstreamStatus >= 500) {
    return "The assistant is temporarily unavailable. Please try again.";
  }
  if (error instanceof Error && error.message === "Tenant not found") {
    return "This portal isn't configured for AI chat yet.";
  }
  return "Something went wrong reaching the assistant. Please try again.";
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body was not valid JSON.", 400, "bad_json");
  }

  try {
    // Check if it's an action request
    if (validateActionBody(body)) {
      const { id: videoId, conversation_id, type, value, label } = body;
      return await streamAIQuestion(videoId, "", value, conversation_id ?? undefined, {
        type,
        label,
      });
    }

    // Otherwise validate as a regular question
    if (!validateQuestionBody(body)) {
      return errorResponse(
        "Invalid request format: expected { question, videoId, subdomain }.",
        400,
        "invalid_request"
      );
    }

    const { question, videoId, subdomain, conversationId } = body;
    return await streamAIQuestion(
      videoId,
      subdomain,
      question,
      conversationId ?? undefined
    );
  } catch (error) {
    // Surface the real reason. An opaque 500 here is what the chat UI can only
    // report as "Failed to initialize stream", which tells nobody anything.
    const upstreamStatus =
      typeof (error as { status?: unknown })?.status === "number"
        ? (error as { status: number }).status
        : undefined;
    const detail =
      error instanceof Error ? error.message : "Unknown error occurred";

    console.error("[api/ask] chat request failed:", detail, error);

    const status =
      upstreamStatus === undefined ? 500 : upstreamStatus >= 500 ? 502 : upstreamStatus;

    return errorResponse(
      readableMessage(error, upstreamStatus),
      status,
      upstreamStatus ? `upstream_${upstreamStatus}` : "portal_error",
      detail
    );
  }
}
