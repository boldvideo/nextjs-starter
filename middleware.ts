import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAuthEnabled } from "@/config/auth";
import { get } from "@vercel/edge-config";

/**
 * Check if running in hosted mode (edge-compatible version).
 */
function isHostedMode(): boolean {
  const tenantToken =
    process.env.BOLD_API_KEY || process.env.NEXT_PUBLIC_BOLD_API_KEY;
  return !tenantToken && !!process.env.BOLD_PLATFORM_KEY;
}

/**
 * Get the effective hostname for tenant resolution.
 * Handles localhost, *.bold.video subdomains, and custom domains via Edge Config.
 */
async function getEffectiveHostname(host: string | null): Promise<string> {
  if (!host) return "";

  // Handle localhost in development
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    return process.env.DEV_TENANT_SUBDOMAIN || "";
  }

  // Standard subdomain pattern: tenant.bold.video
  if (host.endsWith(".bold.video")) {
    return host.split(".")[0];
  }

  // Custom domain: look up in Edge Config
  // Keys use underscores (video_goatmire_com -> goatmire)
  const edgeKey = host.replace(/\./g, "_");
  const tenant = await get<string>(edgeKey);

  return tenant || "";
}

export default auth(async (req) => {
  if (isHostedMode()) {
    const requestHeaders = new Headers(req.headers);
    const effectiveHostname = await getEffectiveHostname(
      req.headers.get("host")
    );

    // No tenant found for this domain
    if (!effectiveHostname) {
      return new NextResponse("Unknown domain", { status: 404 });
    }

    requestHeaders.set("x-bold-hostname", effectiveHostname);

    if (!isAuthEnabled()) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (!isAuthEnabled()) {
    return;
  }
});

export const config = {
  matcher: [
    "/((?!auth|_next/static|_next/image|favicon.ico|auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
