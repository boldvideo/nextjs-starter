import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { isAuthEnabled } from "@/config/auth";
import { get } from "@vercel/edge-config";
import {
  verifyPortalSessionEdge,
  getPortalSessionFromRequest,
  isPortalAuthRequired,
} from "@/lib/portal-auth-edge";
import { DEFAULT_INTERNAL_API_BASE_URL, type CustomRedirect, type Settings } from "@boldvideo/bold-js";

type TenantSettings = Pick<Settings, 'portal'> | null | undefined;

function tryCustomRedirect(
  pathname: string,
  settings: TenantSettings,
  baseUrl: string | URL
): NextResponse | null {
  const redirects = settings?.portal?.customRedirects;
  if (!redirects?.length) return null;

  const match = redirects.find((r: CustomRedirect) => r.path === pathname);
  if (!match) return null;

  try {
    const destination = new URL(match.url, baseUrl);
    return NextResponse.redirect(destination, match.permanent ? 308 : 307);
  } catch {
    return null;
  }
}

const INTERNAL_API_BASE =
  process.env.BOLD_INTERNAL_API_URL ||
  DEFAULT_INTERNAL_API_BASE_URL.replace("/i/v1/", "");

function isHostedMode(): boolean {
  const tenantToken =
    process.env.BOLD_API_KEY || process.env.NEXT_PUBLIC_BOLD_API_KEY;
  return !tenantToken && !!process.env.BOLD_PLATFORM_KEY;
}

async function getEffectiveHostname(host: string | null): Promise<string> {
  if (!host) return "";

  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    return process.env.DEV_TENANT_SUBDOMAIN || "";
  }

  if (host.endsWith(".bold.video") || host.endsWith(".bld.af")) {
    return host.split(".")[0];
  }

  const edgeKey = host.replace(/\./g, "_");
  const tenant = await get<string>(edgeKey);

  return tenant || "";
}

async function fetchTenantSettings(subdomain: string): Promise<unknown> {
  const platformKey = process.env.BOLD_PLATFORM_KEY;
  const tenantToken =
    process.env.BOLD_API_KEY || process.env.NEXT_PUBLIC_BOLD_API_KEY;

  try {
    if (platformKey) {
      const url = `${INTERNAL_API_BASE}/i/v1/sites/${subdomain}`;
      const response = await fetch(url, {
        headers: {
          "x-internal-api-key": platformKey.trim(),
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) return null;

      const json = await response.json();
      return json.data || json;
    }

    if (tenantToken) {
      const baseUrl = process.env.BACKEND_URL || "https://app.boldvideo.io/api/v1";
      const url = baseUrl.endsWith("/api/v1")
        ? `${baseUrl}/settings`
        : `${baseUrl}/api/v1/settings`;
      const response = await fetch(url, {
        headers: {
          Authorization: tenantToken,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) return null;

      const json = await response.json();
      return json.data || json;
    }

    return null;
  } catch {
    return null;
  }
}

function shouldSkipPortalAuth(pathname: string): boolean {
  const skipPaths = [
    "/login",
    "/api/portal-auth",
    "/api/auth",
    "/_next",
    "/favicon.ico",
  ];

  return skipPaths.some((path) => pathname.startsWith(path));
}

export default auth(async (req: NextRequest) => {
  const pathname = req.nextUrl.pathname;

  if (isHostedMode()) {
    const requestHeaders = new Headers(req.headers);
    const effectiveHostname = await getEffectiveHostname(
      req.headers.get("host")
    );

    if (!effectiveHostname) {
      return new NextResponse("Unknown domain", { status: 404 });
    }

    requestHeaders.set("x-bold-hostname", effectiveHostname);

    if (!shouldSkipPortalAuth(pathname)) {
      const settings = await fetchTenantSettings(effectiveHostname);

      const redirectResponse = tryCustomRedirect(pathname, settings as TenantSettings, req.url);
      if (redirectResponse) return redirectResponse;

      if (isPortalAuthRequired(settings)) {
        const sessionToken = getPortalSessionFromRequest(req);

        if (!sessionToken) {
          const loginUrl = new URL("/login", req.url);
          loginUrl.searchParams.set("redirect", pathname + req.nextUrl.search);
          return NextResponse.redirect(loginUrl);
        }

        const session = await verifyPortalSessionEdge(
          sessionToken,
          effectiveHostname
        );

        if (!session) {
          const loginUrl = new URL("/login", req.url);
          loginUrl.searchParams.set("redirect", pathname + req.nextUrl.search);
          const response = NextResponse.redirect(loginUrl);
          response.cookies.delete("portal_session");
          return response;
        }
      }
    }

    if (!isAuthEnabled()) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (!shouldSkipPortalAuth(pathname)) {
    const tenant = process.env.DEV_TENANT_SUBDOMAIN || "standalone";
    const settings = await fetchTenantSettings(tenant);

    const redirectResponse = tryCustomRedirect(pathname, settings as TenantSettings, req.url);
    if (redirectResponse) return redirectResponse;

    const portalAuthRequired =
      isPortalAuthRequired(settings) ||
      process.env.PORTAL_AUTH_REQUIRED === "true";

    if (portalAuthRequired) {
      const sessionToken = getPortalSessionFromRequest(req);

      if (!sessionToken) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("redirect", pathname + req.nextUrl.search);
        return NextResponse.redirect(loginUrl);
      }

      const session = await verifyPortalSessionEdge(sessionToken, tenant);

      if (!session) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("redirect", pathname + req.nextUrl.search);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete("portal_session");
        return response;
      }
    }
  }

  if (!isAuthEnabled()) {
    return;
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
