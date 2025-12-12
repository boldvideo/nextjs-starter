import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_INTERNAL_API_BASE_URL } from "@boldvideo/bold-js";
import { headers } from "next/headers";
import {
  createPortalSession,
  setPortalSessionCookie,
} from "@/lib/portal-auth";

const INTERNAL_API_BASE =
  process.env.BOLD_INTERNAL_API_URL ||
  DEFAULT_INTERNAL_API_BASE_URL.replace("/i/v1/", "");

function getApiBaseUrl(): string {
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) return "https://app.boldvideo.io/api/v1";
  return backendUrl.endsWith("/api/v1") ? backendUrl : `${backendUrl}/api/v1`;
}

async function getTenant(): Promise<string> {
  const tenantToken =
    process.env.BOLD_API_KEY || process.env.NEXT_PUBLIC_BOLD_API_KEY;
  if (tenantToken) {
    return process.env.DEV_TENANT_SUBDOMAIN || "standalone";
  }

  const headersList = await headers();
  return headersList.get("x-bold-hostname") || "";
}

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    const tenant = await getTenant();
    if (!tenant) {
      return NextResponse.json(
        { error: "Unable to determine tenant" },
        { status: 400 }
      );
    }

    const platformKey = process.env.BOLD_PLATFORM_KEY;
    const tenantToken =
      process.env.BOLD_API_KEY || process.env.NEXT_PUBLIC_BOLD_API_KEY;

    let isValid = false;

    if (platformKey) {
      const response = await fetch(
        `${INTERNAL_API_BASE}/i/v1/sites/${tenant}/auth`,
        {
          method: "POST",
          headers: {
            "x-internal-api-key": platformKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        isValid = !!data.token;
      }
    } else if (tenantToken) {
      const response = await fetch(
        `${getApiBaseUrl()}/portal/auth`,
        {
          method: "POST",
          headers: {
            Authorization: tenantToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        isValid = !!data.token;
      }
    } else {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    const token = await createPortalSession(tenant);
    await setPortalSessionCookie(token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Portal Auth] Login error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
