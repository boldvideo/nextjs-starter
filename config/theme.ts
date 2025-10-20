/**
 * Theme configuration utilities
 * This module provides functions to check theme settings
 * based on environment variables
 */

export type ThemeMode = 'toggle' | 'light' | 'dark' | 'system';

/**
 * Get the configured theme mode from environment variables
 * @returns The theme mode (defaults to "toggle")
 */
export function getThemeMode(): ThemeMode {
  const mode = process.env.NEXT_PUBLIC_THEME as ThemeMode;
  // Default to 'toggle' if not set or invalid
  if (!mode || !['toggle', 'light', 'dark', 'system'].includes(mode)) {
    return 'toggle';
  }
  return mode;
}

/**
 * Check if the theme toggle should be shown
 * @returns true if toggle should be displayed
 */
export function shouldShowThemeToggle(): boolean {
  return getThemeMode() === 'toggle';
}

/**
 * Get the forced theme value if applicable
 * @returns The forced theme ('light', 'dark', 'system') or null if toggle mode
 */
export function getForcedTheme(): 'light' | 'dark' | 'system' | null {
  const mode = getThemeMode();
  if (mode === 'toggle') {
    return null;
  }
  return mode;
}

/**
 * Get theme configuration for client-side usage
 * Safe to expose as it only contains public env vars
 */
export function getThemeConfig() {
  const mode = getThemeMode();
  const forcedTheme = getForcedTheme();
  const showToggle = shouldShowThemeToggle();

  return {
    mode,
    forcedTheme,
    showToggle,
  };
}
