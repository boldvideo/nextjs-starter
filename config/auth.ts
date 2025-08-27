/**
 * Authentication configuration utilities
 * This module provides functions to check auth status and configuration
 * based on environment variables
 */

// Bold Video team domains that always have access
const BOLD_TEAM_DOMAINS = [
  'boldvideo.io',
  'boldvideo.com',
  'bold.video'
];

/**
 * Check if authentication is enabled
 * @returns true if auth is enabled via environment variable
 */
export function isAuthEnabled(): boolean {
  // Check both with and without NEXT_PUBLIC prefix for backwards compatibility
  return process.env.AUTH_ENABLED === "true" || 
         process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";
}

/**
 * Get the configured authentication provider
 * @returns The auth provider name (defaults to "google")
 */
export function getAuthProvider(): string {
  // Check both with and without NEXT_PUBLIC prefix for backwards compatibility
  return process.env.AUTH_PROVIDER || 
         process.env.NEXT_PUBLIC_AUTH_PROVIDER || 
         "google";
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
 * Check if an email belongs to the Bold Video team
 * @param email - The email address to check
 * @returns true if email belongs to Bold team
 */
export function isBoldTeamEmail(email: string): boolean {
  const emailDomain = email.split('@')[1]?.toLowerCase();
  if (!emailDomain) {
    return false;
  }
  
  // Check if email domain is in Bold team domains
  return BOLD_TEAM_DOMAINS.some(domain => 
    emailDomain === domain || emailDomain.endsWith(`.${domain}`)
  );
}

/**
 * Check if both Google and WorkOS are configured
 * @returns true if both providers are available
 */
export function hasDualProviders(): boolean {
  const hasGoogle = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  const hasWorkOS = !!(process.env.AUTH_WORKOS_ID && process.env.AUTH_WORKOS_SECRET && process.env.AUTH_WORKOS_CONNECTION);
  return hasGoogle && hasWorkOS;
}

/**
 * Get auth configuration for client-side usage
 * Safe to expose as it only contains public env vars
 */
export function getAuthConfig() {
  const provider = getAuthProvider();
  const hasDual = hasDualProviders();
  
  return {
    enabled: isAuthEnabled(),
    provider: hasDual ? 'dual' : provider,
    allowedDomains: getAllowedDomains(),
    hasDualProviders: hasDual,
  };
}