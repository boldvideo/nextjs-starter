"use server";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

interface AIRequestBody {
  question: string;
  videoId: string;
  tenant: string;
  conversation?: Message[];
}

/**
 * Streams AI responses from the backend
 */
export async function streamAIQuestion(
  videoId: string,
  tenant: string,
  question: string,
  conversation?: Message[]
) {
  const apiHost = process.env.BACKEND_URL;
  const apiKey = process.env.NEXT_PUBLIC_BOLD_API_KEY;

  if (!apiHost || !apiKey) {
    console.error("[AI Question] Missing configuration:", {
      hasApiHost: !!apiHost,
      hasApiKey: !!apiKey
    });
    throw new Error("Missing API configuration");
  }

  const apiUrl = apiHost.startsWith("http") ? apiHost : `https://${apiHost}`;
  const endpoint = `${apiUrl}/videos/${videoId}/ask`;

  console.log("[AI Question] Request details:", {
    endpoint,
    videoId,
    tenant,
    questionLength: question.length,
    hasConversation: !!conversation,
  });

  try {
    const requestBody = {
      q: question,
      vid: videoId,
      subd: tenant,
      c: conversation,
    };

    console.log("[AI Question] Request body:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    console.log("[AI Question] Response status:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[AI Question] Error response:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        endpoint,
      });
      throw new Error(
        `Failed to fetch AI response: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    // Transform the response stream
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              controller.close();
              break;
            }

            // Pass through the SSE data directly
            controller.enqueue(value);
          }
        } catch (error: any) {
          const errorEvent = `data: ${JSON.stringify({
            type: "error",
            content: error?.message || "Unknown error occurred",
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorEvent));
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    throw error;
  }
}
