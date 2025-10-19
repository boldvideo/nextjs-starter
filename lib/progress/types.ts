/**
 * Progress record stored in IndexedDB
 * Version 2: Separate position (resume) and furthest watched (progress)
 */
export interface ProgressRecord {
  /** Composite key: "bt_${tenantSlug}:${videoId}" */
  id: string;

  /** Video ID (hashid) */
  videoId: string;

  /** Tenant ID with "bt_" prefix (e.g., "bt_ranger") */
  tenantId: string;

  /** Last playback position in seconds (for resume) */
  position: number;

  /** Furthest position ever watched in seconds (for progress bars) */
  furthestPosition: number;

  /** Total video duration in seconds */
  duration: number;

  /** Calculated percentage: (furthestPosition / duration) * 100 */
  percentWatched: number;

  /** True if percentWatched >= COMPLETION_THRESHOLD */
  completed: boolean;

  /** ISO 8601 timestamp of last update */
  lastWatched: string;

  /** Schema version (2 for v2) */
  version: number;
}

/**
 * Configuration constants
 */
export const PROGRESS_CONFIG = {
  DB_NAME: 'bold-video-progress',
  STORE_NAME: 'progress',
  VERSION: 2,
  COMPLETION_THRESHOLD: 90, // Percentage
  THROTTLE_INTERVAL: 2500,  // Milliseconds (2.5 seconds)
  STORAGE_KEY_PREFIX: 'bt_',
} as const;
