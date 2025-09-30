import { streamAIQuestion } from "../../../lib/ai-question";
import { Message } from "../../../lib/ai-question";

export const runtime = "edge"; // Optional: Use edge runtime for better streaming performance

/**
 * Validates the request body
 */
function validateBody(body: any): body is {
  question: string;
  videoId: string;
  subdomain: string;
  conversation?: Message[];
} {
  return (
    typeof body.question === "string" &&
    typeof body.videoId === "string" &&
    typeof body.subdomain === "string" &&
    (body.conversation === undefined || Array.isArray(body.conversation))
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!validateBody(body)) {
      console.error("[API /ask] Invalid body:", JSON.stringify(body));
      return new Response(
        JSON.stringify({
          type: "error",
          content: `Invalid request format. Missing or invalid: ${!body.question ? 'question ' : ''}${!body.videoId ? 'videoId ' : ''}${!body.subdomain && body.subdomain !== '' ? 'subdomain' : ''}`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }
      );
    }

    const { question, videoId, subdomain, conversation } = body;
    return streamAIQuestion(videoId, subdomain, question, conversation);
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
