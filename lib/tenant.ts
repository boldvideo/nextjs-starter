import "server-only";

export type PortalMode = "standalone" | "hosted";

export interface PortalModeConfig {
  mode: PortalMode;
  tenantToken?: string;
  platformKey?: string;
  rootDomain?: string;
}

/**
 * Detect portal mode from environment variables.
 * Priority: BOLD_API_KEY (Standalone) > BOLD_PLATFORM_KEY (Hosted)
 *
 * Throws on misconfiguration to fail fast.
 */
export function getPortalMode(): PortalModeConfig {
  const tenantToken =
    process.env.BOLD_API_KEY || process.env.NEXT_PUBLIC_BOLD_API_KEY;
  const platformKey = process.env.BOLD_PLATFORM_KEY;
  const rootDomain = process.env.ROOT_DOMAIN;

  if (tenantToken) {
    return { mode: "standalone", tenantToken };
  }

  if (platformKey) {
    // ROOT_DOMAIN is optional - only needed in production to extract subdomain from hostname
    // For local dev, DEV_TENANT_SUBDOMAIN is passed directly
    return { mode: "hosted", platformKey, rootDomain };
  }

  throw new Error(
    "Bold portal misconfigured: set BOLD_API_KEY (standalone) OR BOLD_PLATFORM_KEY (hosted)."
  );
}

/**
 * Check if running in hosted mode (useful for conditional logic).
 */
export function isHostedMode(): boolean {
  const tenantToken =
    process.env.BOLD_API_KEY || process.env.NEXT_PUBLIC_BOLD_API_KEY;
  return !tenantToken && !!process.env.BOLD_PLATFORM_KEY;
}

/**
 * Check if running in standalone mode (useful for conditional logic).
 */
export function isStandaloneMode(): boolean {
  return !isHostedMode();
}

/**
 * Extract hostname for tenant resolution, handling localhost.
 *
 * In development, uses DEV_TENANT_SUBDOMAIN to simulate a tenant.
 * Example: DEV_TENANT_SUBDOMAIN=demo -> localhost behaves like demo.bold.video
 */
export function getHostnameFromHeaders(
  headers: Headers,
  rootDomain?: string
): string | null {
  const host = headers.get("host");
  if (!host) return null;

  // Handle localhost in development
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    const devSubdomain = process.env.DEV_TENANT_SUBDOMAIN;
    if (devSubdomain && rootDomain) {
      return `${devSubdomain}.${rootDomain}`;
    }
    // No dev subdomain configured — return null to trigger 404 or fallback
    return null;
  }

  return host;
}

/**
 * Extract subdomain from a hostname given a root domain.
 * Example: demo.bold.video with rootDomain bold.video -> demo
 */
export function extractSubdomain(
  hostname: string,
  rootDomain: string
): string | null {
  // Normalize both to lowercase
  const normalizedHost = hostname.toLowerCase();
  const normalizedRoot = rootDomain.toLowerCase();

  // Check if the hostname ends with the root domain
  if (!normalizedHost.endsWith(normalizedRoot)) {
    // This might be a custom domain, return null to signal custom domain lookup
    return null;
  }

  // Extract the subdomain part
  const subdomain = normalizedHost
    .slice(0, normalizedHost.length - normalizedRoot.length)
    .replace(/\.$/, ""); // Remove trailing dot

  // Return null for empty subdomain (root domain access)
  if (!subdomain) {
    return null;
  }

  return subdomain;
}
