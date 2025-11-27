import "server-only";

import { createClient } from "@boldvideo/bold-js";

/**
 * Check if running in hosted mode.
 * Standalone: BOLD_API_KEY or NEXT_PUBLIC_BOLD_API_KEY is set
 * Hosted: BOLD_PLATFORM_KEY is set (no tenant token in env)
 */
function isHostedMode(): boolean {
  const tenantToken =
    process.env.BOLD_API_KEY || process.env.NEXT_PUBLIC_BOLD_API_KEY;
  return !tenantToken && !!process.env.BOLD_PLATFORM_KEY;
}

/**
 * @deprecated Use getTenantContext() in server components/API routes
 * or useBold() hook in client components.
 *
 * This global singleton only works in standalone mode with BOLD_API_KEY.
 * It will throw an error in hosted mode.
 */
function createGlobalClient() {
  if (isHostedMode()) {
    throw new Error(
      "The global `bold` client is not available in hosted mode. " +
        "Use getTenantContext() for server components or useBold() hook for client components."
    );
  }

  const tenantToken =
    process.env.BOLD_API_KEY || process.env.NEXT_PUBLIC_BOLD_API_KEY;

  if (!tenantToken) {
    throw new Error(
      "BOLD_API_KEY is required for the global client. " +
        "Use getTenantContext() or useBold() for multitenancy support."
    );
  }

  return createClient(tenantToken, {
    baseURL: process.env.BACKEND_URL || "https://app.boldvideo.io/api/v1",
    debug: false,
  });
}

export const bold = createGlobalClient();
