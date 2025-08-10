import { NextRequest, NextResponse } from "next/server";

// Configure max duration for Vercel functions (60 seconds)
export const maxDuration = 60;

// Handle GET requests
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || searchParams.get("query");

  return processAsk(query, request);
}

// Handle POST requests
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = body.query || body.q;

    return processAsk(query, request);
  } catch (error) {
    console.error("[Ask Global API] POST parsing error:", error);
    return NextResponse.json(
      { error: "Invalid request format" },
      { status: 400 }
    );
  }
}

// Common ask processing function
async function processAsk(query: string | null, request: NextRequest) {
  if (!query) {
    return NextResponse.json(
      { error: "Missing query parameter" },
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
    
    // Safely construct the URL
    const endpointUrl = new URL(baseUrl + urlPath);
    endpointUrl.searchParams.append("q", query);

    const endpoint = endpointUrl.toString();

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