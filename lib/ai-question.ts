"use server";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

interface AIRequestBody {
  question: string;
  videoId: string;
  tenant: string;
  conversationId?: string;
}

/**
 * Streams AI responses from the backend
 */
export async function streamAIQuestion(
  videoId: string,
  tenant: string,
  question: string,
  conversationId?: string,
  actionData?: { type: string; label: string }
) {
  const apiHost = process.env.BACKEND_URL;
  const apiKey = process.env.NEXT_PUBLIC_BOLD_API_KEY;

  if (!apiHost || !apiKey) {
    throw new Error("Missing API configuration");
  }

  const apiUrl = apiHost.startsWith("http") ? apiHost : `https://${apiHost}`;
  const endpoint = `${apiUrl}/videos/${videoId}/ask`;

  const requestBody = actionData
    ? {
        conversation_id: conversationId,
        type: actionData.type,
        value: question,
        label: actionData.label,
      }
    : {
        q: question,
        ...(conversationId && { conversation_id: conversationId }),
      };

  console.log('=== BACKEND REQUEST DEBUG ===');
  console.log('Endpoint:', endpoint);
  console.log('Is Action:', !!actionData);
  console.log('Request Body:', JSON.stringify(requestBody, null, 2));
  console.log('Headers:', {
    'Content-Type': 'application/json',
    Authorization: apiKey?.substring(0, 10) + '...',
  });
  console.log('============================');

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('=== BACKEND RESPONSE DEBUG ===');
    console.log('Status:', response.status, response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    console.log('==============================');

    if (!response.ok) {
      const errorText = await response.text();
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
