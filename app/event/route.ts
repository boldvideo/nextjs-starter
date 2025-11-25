import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const apiHost = process.env.BACKEND_URL || "https://api.boldvideo.io";
    const apiKey = process.env.NEXT_PUBLIC_BOLD_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing API configuration" },
        { status: 500 }
      );
    }

    // Ensure the apiHost is a valid URL
    let baseUrl = apiHost;
    if (!baseUrl.startsWith("http")) {
      baseUrl = `https://${baseUrl}`;
    }

    // Construct the endpoint URL
    const endpointUrl = new URL("/api/v1/event", baseUrl);

    const response = await fetch(endpointUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Event tracking failed with status ${response.status}` },
        { status: response.status }
      );
    }

    // Events usually just return 200 OK or 201 Created, maybe with empty body or some data
    // We can try to parse json, or just return ok if it was ok.
    // To be safe, let's try to return what the server returned.
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      return NextResponse.json(data);
    }

    return new NextResponse(null, { status: response.status });
  } catch (error) {
    console.error("[Event API] Error:", error);
    return NextResponse.json(
      { error: "Failed to track event" },
      { status: 500 }
    );
  }
}
