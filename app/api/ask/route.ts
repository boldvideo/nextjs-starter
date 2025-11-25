import { streamAIQuestion } from "../../../lib/ai-question";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for web search support

interface QuestionBody {
  question: string;
  videoId: string;
  subdomain: string;
  conversationId?: string;
}

interface ActionBody {
  type: "action";
  value: string;
  label: string;
  id: string;
  conversation_id?: string;
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
    (b.conversationId === undefined || typeof b.conversationId === "string")
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
    (b.conversation_id === undefined || typeof b.conversation_id === "string")
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log('[API Route] Received request:', JSON.stringify(body, null, 2));

    // Check if it's an action request
    if (validateActionBody(body)) {
      console.log('[API Route] Handling as ACTION request');
      const { id: videoId, conversation_id, type, value, label } = body;
      return streamAIQuestion(videoId, "", value, conversation_id, { type, label });
    }

    // Otherwise validate as a regular question
    if (!validateQuestionBody(body)) {
      console.log('[API Route] Invalid request format');
      return new Response(
        JSON.stringify({
          type: "error",
          content: "Invalid request format",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }
      );
    }

    console.log('[API Route] Handling as QUESTION request');
    const { question, videoId, subdomain, conversationId } = body;
    return streamAIQuestion(videoId, subdomain, question, conversationId);
  } catch (error) {
    console.error('[API Route] Error:', error);
    return new Response(
      JSON.stringify({
        type: "error",
        content:
          error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }
    );
  }
}
