"use client";

/**
 * Storage key for progress tracking preference
 */
const PREFERENCE_KEY = 'bold-progress-enabled';

/**
 * Check if progress tracking is enabled (default: true)
 */
export function isProgressTrackingEnabled(): boolean {
  if (typeof window === 'undefined') return true; // SSR default

  try {
    const stored = localStorage.getItem(PREFERENCE_KEY);
    // Default to enabled if no preference set
    return stored === null ? true : stored === 'true';
  } catch {
    return true; // Fail open
  }
}

/**
 * Set progress tracking preference
 */
export function setProgressTrackingEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(PREFERENCE_KEY, String(enabled));
  } catch (error) {
    console.warn('[ProgressPreferences] Failed to save preference:', error);
  }
}
