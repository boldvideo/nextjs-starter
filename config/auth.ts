/**
 * Authentication configuration utilities
 * This module provides functions to check auth status and configuration
 * based on environment variables
 */

/**
 * Check if authentication is enabled
 * @returns true if auth is enabled via environment variable
 */
export function isAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";
}

/**
 * Get the configured authentication provider
 * @returns The auth provider name (defaults to "google")
 */
export function getAuthProvider(): string {
  return process.env.NEXT_PUBLIC_AUTH_PROVIDER || "google";
}

/**
 * Get the list of allowed email domains for authentication
 * @returns Array of allowed domains, empty array if none specified
 */
export function getAllowedDomains(): string[] {
  const domains = process.env.NEXT_PUBLIC_AUTH_ALLOWED_DOMAINS;
  return domains ? domains.split(",").map((d) => d.trim().toLowerCase()) : [];
}

/**
 * Check if an email is allowed based on domain restrictions
 * @param email - The email address to check
 * @returns true if email is allowed or no restrictions are set
 */
export function isEmailAllowed(email: string): boolean {
  const allowedDomains = getAllowedDomains();
  
  // If no domains are specified, allow all
  if (allowedDomains.length === 0) {
    return true;
  }
  
  // Extract domain from email
  const emailDomain = email.split("@")[1]?.toLowerCase();
  if (!emailDomain) {
    return false;
  }
  
  // Check if email domain is in allowed list
  return allowedDomains.includes(emailDomain);
}

/**
 * Get auth configuration for client-side usage
 * Safe to expose as it only contains public env vars
 */
export function getAuthConfig() {
  return {
    enabled: isAuthEnabled(),
    provider: getAuthProvider(),
    allowedDomains: getAllowedDomains(),
  };
}