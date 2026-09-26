import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/get-tenant-context";
import { isSearchRequestId } from "@/lib/search-request";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }
    // The starter has no server-established Bold viewer mapping. Never trust one
    // supplied by the browser, including on legacy playback events.
    delete body.viewer;
    if (body.n === "source_open" || body.n === "video_progress") {
      if (!isSearchRequestId(body.interaction_id) || !isSearchRequestId(body.playback_id) ||
          typeof body.vid !== "string" || !body.vid ||
          (body.n === "video_progress" && (typeof body.watched_seconds !== "number" ||
            !Number.isFinite(body.watched_seconds) || body.watched_seconds < 0))) {
        return NextResponse.json({ error: "Invalid engagement event" }, { status: 400 });
      }
      if (body.n === "source_open") delete body.watched_seconds;
    }

    const apiHost = process.env.BACKEND_URL || "https://app.boldvideo.io/api/v1";
    // Frequent progress events need the trusted tenant token, not portal settings.
    const context = await getTenantContext({ includeSettings: false });
    const apiKey = context?.tenantToken;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
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
