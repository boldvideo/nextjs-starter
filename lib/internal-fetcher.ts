import "server-only";

import { DEFAULT_INTERNAL_API_BASE_URL } from "@boldvideo/bold-js";
import { extractSubdomain } from "./tenant";

// Base URL for internal API (without /i/v1 suffix since we add it in paths)
const INTERNAL_API_BASE = process.env.BACKEND_URL ||
  DEFAULT_INTERNAL_API_BASE_URL.replace("/i/v1/", "");

export interface SiteConfig {
  tenant_token: string;
  subdomain?: string;
  custom_domain?: string;
  account?: {
    id: string;
    name: string;
    subdomain: string;
  };
  // Additional fields from the settings API
  metaData?: Record<string, unknown>;
  themeConfig?: Record<string, unknown>;
  favicon_url?: string;
  logo_url?: string;
}

export interface SiteConfigResponse {
  data: SiteConfig | null;
  error?: string;
}

/**
 * Fetch site configuration from the Bold platform API.
 * Used in hosted mode to resolve tenant from hostname.
 */
async function fetchSiteBySubdomain(
  subdomain: string,
  platformKey: string
): Promise<SiteConfigResponse> {
  try {
    const url = `${INTERNAL_API_BASE}/i/v1/sites/${subdomain}`;

    const response = await fetch(url, {
      headers: {
        "x-internal-api-key": platformKey.trim(),
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { data: null, error: "Site not found" };
      }
      return { data: null, error: `API error: ${response.status}` };
    }

    const json = await response.json();
    return { data: json.data || json };
  } catch (error) {
    console.error("[Internal Fetcher] Error fetching site config:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fetch site configuration by custom domain.
 * Used when the hostname doesn't match the root domain.
 */
async function fetchSiteByCustomDomain(
  domain: string,
  platformKey: string
): Promise<SiteConfigResponse> {
  try {
    const response = await fetch(
      `${INTERNAL_API_BASE}/i/v1/sites/domain/${encodeURIComponent(domain)}`,
      {
        headers: {
          "x-internal-api-key": platformKey,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { data: null, error: "Custom domain not found" };
      }
      return { data: null, error: `API error: ${response.status}` };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error(
      "[Internal Fetcher] Error fetching site by custom domain:",
      error
    );
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Resolve site configuration from hostname or subdomain.
 *
 * Workflow:
 * 1. If hostname looks like a simple subdomain (no dots), fetch by subdomain directly
 * 2. If hostname is a subdomain of rootDomain, extract and fetch by subdomain
 * 3. Otherwise, treat as custom domain and lookup via domain API
 */
export async function resolveSiteConfig(
  hostnameOrSubdomain: string,
  rootDomain?: string
): Promise<SiteConfigResponse> {
  const platformKey = process.env.BOLD_PLATFORM_KEY;

  if (!platformKey) {
    return { data: null, error: "BOLD_PLATFORM_KEY not configured" };
  }

  // If it's just a simple name (no dots), treat as subdomain directly
  // This handles the local dev case where we pass DEV_TENANT_SUBDOMAIN directly
  if (!hostnameOrSubdomain.includes(".")) {
    return fetchSiteBySubdomain(hostnameOrSubdomain, platformKey);
  }

  // Try to extract subdomain from full hostname
  if (rootDomain) {
    const subdomain = extractSubdomain(hostnameOrSubdomain, rootDomain);
    if (subdomain) {
      return fetchSiteBySubdomain(subdomain, platformKey);
    }
  }

  // Not a subdomain of rootDomain — try custom domain lookup
  return fetchSiteByCustomDomain(hostnameOrSubdomain, platformKey);
}
