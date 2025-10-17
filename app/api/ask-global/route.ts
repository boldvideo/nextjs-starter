import { NextRequest, NextResponse } from "next/server";

// Configure max duration for Vercel functions (60 seconds)
export const maxDuration = 60;

// Handle GET requests
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || searchParams.get("query");
  const conversationId = searchParams.get("conversation_id");
  const mode = searchParams.get("mode") || "enhanced";
  const synthesize = searchParams.get("synthesize") || "true";
  const limit = searchParams.get("limit");
  const videoId = searchParams.get("video_id");
  const language = searchParams.get("language");
  const semanticRatio = searchParams.get("semantic_ratio");
  const maxPerVideo = searchParams.get("max_per_video");

  return processAsk({
    query,
    conversationId,
    mode,
    synthesize,
    limit,
    videoId,
    language,
    semanticRatio,
    maxPerVideo
  });
}

// Handle POST requests
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    return processAsk({
      query: body.query || body.q,
      conversationId: body.conversation_id,
      mode: body.mode || "enhanced",
      synthesize: body.synthesize !== undefined ? body.synthesize : "true",
      limit: body.limit,
      videoId: body.video_id,
      language: body.language,
      semanticRatio: body.semantic_ratio,
      maxPerVideo: body.max_per_video
    });
  } catch (error) {
    console.error("[Ask Global API] POST parsing error:", error);
    return NextResponse.json(
      { error: "Invalid request format" },
      { status: 400 }
    );
  }
}

// Common ask processing function with all parameters
interface ProcessAskParams {
  query: string | null;
  conversationId?: string | null;
  mode?: string;
  synthesize?: string;
  limit?: string | null;
  videoId?: string | null;
  language?: string | null;
  semanticRatio?: string | null;
  maxPerVideo?: string | null;
}

async function processAsk(params: ProcessAskParams) {
  const { query, conversationId, mode = "enhanced", synthesize = "true" } = params;
  
  if (!query) {
    return NextResponse.json(
      { error: "Missing required parameter: q" },
      { status: 400 }
    );
  }

  const apiHost = process.env.BACKEND_URL || "https://api.boldvideo.io";
  const apiKey = process.env.NEXT_PUBLIC_BOLD_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing API configuration" },
      { status: 500 }
    );
  }

  // Simple validation that the API key has a reasonable format
  if (typeof apiKey !== "string" || apiKey.length < 20) {
    return NextResponse.json(
      { error: "Invalid API configuration" },
      { status: 500 }
    );
  }

  try {
    // Ensure the apiHost is a valid URL
    let baseUrl = apiHost;
    if (!baseUrl.startsWith("http")) {
      baseUrl = `https://${baseUrl}`;
    }

    // Remove trailing slash if present
    baseUrl = baseUrl.replace(/\/$/, '');
    
    // Check if baseUrl already includes /api/v1
    const urlPath = baseUrl.includes('/api/v1') ? '/ask' : '/api/v1/ask';
    
    // Safely construct the URL with all parameters
    const endpointUrl = new URL(baseUrl + urlPath);
    endpointUrl.searchParams.append("q", query);
    endpointUrl.searchParams.append("mode", mode);
    endpointUrl.searchParams.append("synthesize", synthesize);
    
    // Add optional parameters if provided
    if (params.conversationId) {
      endpointUrl.searchParams.append("conversation_id", params.conversationId);
    }
    if (params.limit) {
      endpointUrl.searchParams.append("limit", params.limit);
    }
    if (params.videoId) {
      endpointUrl.searchParams.append("video_id", params.videoId);
    }
    if (params.language) {
      endpointUrl.searchParams.append("language", params.language);
    }
    if (params.semanticRatio) {
      endpointUrl.searchParams.append("semantic_ratio", params.semanticRatio);
    }
    if (params.maxPerVideo) {
      endpointUrl.searchParams.append("max_per_video", params.maxPerVideo);
    }

    const endpoint = endpointUrl.toString();
    console.log("[Ask Global API] Calling endpoint:", endpoint.replace(query, "***"));

    // Add AbortController for timeout (50 seconds to leave buffer for Vercel's 60s limit)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000);

    const response = await fetch(endpoint, {
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      cache: "no-store",
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Ask Global API] Error response:", errorText);
      return NextResponse.json(
        { error: `Ask request failed with status ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Ask Global API] Error:", error);
    return NextResponse.json(
      { error: "Failed to process question" },
      { status: 500 }
    );
  }
}