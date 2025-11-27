import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAuthEnabled } from "@/config/auth";

/**
 * Check if running in hosted mode (edge-compatible version).
 * Does not use "server-only" imports.
 */
function isHostedMode(): boolean {
  const tenantToken =
    process.env.BOLD_API_KEY || process.env.NEXT_PUBLIC_BOLD_API_KEY;
  return !tenantToken && !!process.env.BOLD_PLATFORM_KEY;
}

/**
 * Get the effective hostname for tenant resolution.
 * On localhost, uses DEV_TENANT_SUBDOMAIN directly.
 */
function getEffectiveHostname(host: string | null): string {
  if (!host) return "";

  // Handle localhost in development - just use the dev subdomain directly
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    return process.env.DEV_TENANT_SUBDOMAIN || "";
  }

  return host;
}

export default auth((req) => {
  // In hosted mode, inject hostname header for getTenantContext to read
  if (isHostedMode()) {
    const requestHeaders = new Headers(req.headers);
    const effectiveHostname = getEffectiveHostname(req.headers.get("host"));
    requestHeaders.set("x-bold-hostname", effectiveHostname);

    // If auth is disabled, just pass through with headers
    if (!isAuthEnabled()) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // Auth is enabled — continue with auth logic but with modified headers
    // The auth callback handles authentication automatically
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Standalone mode: Skip middleware if auth is disabled
  if (!isAuthEnabled()) {
    return;
  }

  // Auth is enabled, the auth callback handles authentication automatically
});

export const config = {
  // Matcher configuration - protect all routes except:
  // - api routes (except auth)
  // - static files
  // - auth routes
  matcher: [
    // "/((?!api/auth|_next/static|_next/image|favicon.ico|auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    "/((?!auth|_next/static|_next/image|favicon.ico|auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

