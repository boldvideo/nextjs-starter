import "server-only";

import { headers } from "next/headers";
import {
  createClient,
  type Settings,
  DEFAULT_API_BASE_URL,
} from "@boldvideo/bold-js";
import { getPortalMode, getHostnameFromHeaders } from "./tenant";
import { resolveSiteConfig } from "./internal-fetcher";

// BoldClient type from bold-js
type BoldClient = ReturnType<typeof createClient>;

export interface TenantContext {
  client: BoldClient;
  settings: Settings | null;
  tenantToken: string;
  mode: "standalone" | "hosted";
  subdomain?: string;
}

/**
 * Resolve tenant context for the current request.
 *
 * In standalone mode, uses BOLD_API_KEY directly.
 * In hosted mode, resolves tenant from hostname via platform API.
 *
 * Returns null if tenant cannot be resolved (invalid domain, etc).
 */
export async function getTenantContext(): Promise<TenantContext | null> {
  const config = getPortalMode();
  const baseURL = process.env.BACKEND_URL || DEFAULT_API_BASE_URL;

  // Standalone Path — use the API key directly
  if (config.mode === "standalone") {
    if (!config.tenantToken) return null;

    const client = createClient(config.tenantToken, {
      baseURL,
      debug: false,
    });

    try {
      const { data: settings } = await client.settings();
      return {
        client,
        settings,
        tenantToken: config.tenantToken,
        mode: "standalone",
      };
    } catch (error) {
      console.error("[Tenant Context] Failed to fetch settings:", error);
      return {
        client,
        settings: null,
        tenantToken: config.tenantToken,
        mode: "standalone",
      };
    }
  }

  // Hosted Path — resolve tenant from hostname
  const headersList = await headers();
  const hostname =
    headersList.get("x-bold-hostname") ||
    getHostnameFromHeaders(headersList, config.rootDomain);

  if (!hostname) {
    console.warn("[Tenant Context] No hostname available for hosted mode");
    return null;
  }

  // Resolve Site Config via Internal API
  const siteConfig = await resolveSiteConfig(hostname, config.rootDomain!);

  if (!siteConfig.data?.tenant_token) {
    console.warn(
      "[Tenant Context] Failed to resolve tenant for hostname:",
      hostname,
      siteConfig.error
    );
    return null;
  }

  const tenantToken = siteConfig.data.tenant_token;
  const subdomain = siteConfig.data.subdomain || siteConfig.data.account?.subdomain;

  // Create SDK client with resolved tenant token
  const client = createClient(tenantToken, {
    baseURL,
    debug: false,
  });

  // Use SDK to fetch settings - this ensures consistent camelCase transformation
  // and uses the same code path as standalone mode
  try {
    const { data: settings } = await client.settings();
    return {
      client,
      settings,
      tenantToken,
      mode: "hosted",
      subdomain,
    };
  } catch (error) {
    console.error("[Tenant Context] Failed to fetch settings in hosted mode:", error);
    return {
      client,
      settings: null,
      tenantToken,
      mode: "hosted",
      subdomain,
    };
  }
}

/**
 * Get tenant context or throw if not available.
 * Use this when tenant context is required (e.g., in API routes).
 */
export async function requireTenantContext(): Promise<TenantContext> {
  const context = await getTenantContext();
  if (!context) {
    throw new Error("Tenant context not available");
  }
  return context;
}
