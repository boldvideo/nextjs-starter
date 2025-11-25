import { NextRequest, NextResponse } from "next/server";

// Handle GET requests
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  // Support both 'q' and 'query' parameter names for compatibility
  const query = searchParams.get("q") || searchParams.get("query");

  return processSearch(query, request);
}

// Handle POST requests to avoid URL parsing issues
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = body.query || body.q;

    return processSearch(query, request);
  } catch (error) {
    console.error("[Search API] POST parsing error:", error);
    return NextResponse.json(
      { error: "Invalid request format" },
      { status: 400 }
    );
  }
}

// Common search processing function
async function processSearch(query: string | null, _request: NextRequest) {
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

    // Safely construct the URL
    const endpointUrl = new URL("/api/v1/search", baseUrl);
    endpointUrl.searchParams.append("query", query);

    const endpoint = endpointUrl.toString();

    const response = await fetch(endpoint, {
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      await response.text(); // Consume error body
      return NextResponse.json(
        { error: `Search request failed with status ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Search API] Error:", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}
