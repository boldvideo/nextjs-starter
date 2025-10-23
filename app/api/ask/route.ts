import { streamAIQuestion } from "../../../lib/ai-question";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for web search support

/**
 * Validates the request body
 */
function validateBody(body: any): body is {
  question: string;
  videoId: string;
  subdomain: string;
  conversationId?: string;
} {
  return (
    typeof body.question === "string" &&
    typeof body.videoId === "string" &&
    typeof body.subdomain === "string" &&
    (body.conversationId === undefined || typeof body.conversationId === "string")
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!validateBody(body)) {
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

    const { question, videoId, subdomain, conversationId } = body;
    return streamAIQuestion(videoId, subdomain, question, conversationId);
  } catch (error) {
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
