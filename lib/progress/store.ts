import { openDB, type IDBPDatabase } from 'idb';
import type { ProgressRecord } from './types';
import { PROGRESS_CONFIG } from './types';
import { broadcastProgressUpdate } from './sync';
import { isValidPosition, isValidProgressRecord } from './validation';

interface ProgressDBSchema {
  progress: {
    key: string;
    value: ProgressRecord;
  };
}

type ProgressDB = IDBPDatabase<ProgressDBSchema>;

let dbInstance: ProgressDB | null = null;

/**
 * Initialize and return the IndexedDB database
 * Lazy initialization - opens on first use
 */
async function getDB(): Promise<ProgressDB> {
  if (dbInstance) return dbInstance;

  try {
    dbInstance = await openDB<ProgressDBSchema>(
      PROGRESS_CONFIG.DB_NAME,
      PROGRESS_CONFIG.VERSION,
      {
        upgrade(db) {
          // Create object store on first run or version upgrade
          if (!db.objectStoreNames.contains(PROGRESS_CONFIG.STORE_NAME)) {
            db.createObjectStore(PROGRESS_CONFIG.STORE_NAME, {
              keyPath: 'id',
            });
          }
        },
      }
    );
    return dbInstance;
  } catch (error) {
    console.error('[ProgressStore] Failed to open database:', error);
    throw error;
  }
}

/**
 * Generate composite key for storage
 * Format: "bt_${tenantSlug}:${videoId}"
 */
export function generateProgressKey(tenantId: string, videoId: string): string {
  return `${tenantId}:${videoId}`;
}

/**
 * Get progress for a specific video
 * Returns null if no progress exists or on error
 */
export async function getProgress(
  tenantId: string,
  videoId: string
): Promise<ProgressRecord | null> {
  try {
    const db = await getDB();
    const key = generateProgressKey(tenantId, videoId);
    const record = await db.get(PROGRESS_CONFIG.STORE_NAME, key);

    // Discard corrupted records
    if (record && !isValidProgressRecord(record)) {
      console.warn('[ProgressStore] Corrupted record found, discarding:', record.id);
      return null;
    }

    return record || null;
  } catch (error) {
    console.warn('[ProgressStore] Failed to get progress:', error);
    return null;
  }
}

/**
 * Save or update progress for a video
 * Calculates percentWatched and completed status automatically
 * Tracks furthest position (never goes backwards) for progress bars
 */
export async function saveProgress(
  tenantId: string,
  videoId: string,
  position: number,
  duration: number
): Promise<void> {
  // Validate inputs
  if (!isValidPosition(position, duration)) {
    console.warn('[ProgressStore] Invalid position, skipping save:', {
      position,
      duration,
    });
    return;
  }

  try {
    const db = await getDB();
    const key = generateProgressKey(tenantId, videoId);

    // Get existing record to preserve furthest position
    const existingRecord = await db.get(PROGRESS_CONFIG.STORE_NAME, key);

    // Calculate furthest position (max of current and previous)
    const furthestPosition = Math.max(
      position,
      existingRecord?.furthestPosition || 0
    );

    // Calculate derived fields based on furthest position
    const percentWatched = Math.min((furthestPosition / duration) * 100, 100);
    const completed = percentWatched >= PROGRESS_CONFIG.COMPLETION_THRESHOLD;

    const record: ProgressRecord = {
      id: key,
      videoId,
      tenantId,
      position,              // Last watched (for resume)
      furthestPosition,      // Max watched (for progress bars)
      duration,
      percentWatched,
      completed,
      lastWatched: new Date().toISOString(),
      version: PROGRESS_CONFIG.VERSION,
    };

    await db.put(PROGRESS_CONFIG.STORE_NAME, record);

    // Broadcast update to other tabs
    broadcastProgressUpdate(videoId, tenantId);
  } catch (error) {
    console.warn('[ProgressStore] Failed to save progress:', error);
    // Fail silently - feature degrades gracefully
  }
}

/**
 * Delete progress for a specific video
 */
export async function deleteProgress(
  tenantId: string,
  videoId: string
): Promise<void> {
  try {
    const db = await getDB();
    const key = generateProgressKey(tenantId, videoId);
    await db.delete(PROGRESS_CONFIG.STORE_NAME, key);
  } catch (error) {
    console.warn('[ProgressStore] Failed to delete progress:', error);
  }
}

/**
 * Get all progress records for a tenant
 * Useful for displaying progress in playlist views
 */
export async function getAllProgress(
  tenantId: string
): Promise<ProgressRecord[]> {
  try {
    const db = await getDB();
    const allRecords = await db.getAll(PROGRESS_CONFIG.STORE_NAME);

    // Filter by tenant ID
    return allRecords.filter((record) => record.tenantId === tenantId);
  } catch (error) {
    console.warn('[ProgressStore] Failed to get all progress:', error);
    return [];
  }
}

/**
 * Clear all progress for a tenant
 * Used for "Clear all progress" feature
 */
export async function clearAllProgress(tenantId: string): Promise<void> {
  try {
    const db = await getDB();
    const allRecords = await db.getAll(PROGRESS_CONFIG.STORE_NAME);

    // Delete only records for this tenant
    const deletePromises = allRecords
      .filter((record) => record.tenantId === tenantId)
      .map((record) => db.delete(PROGRESS_CONFIG.STORE_NAME, record.id));

    await Promise.all(deletePromises);
  } catch (error) {
    console.warn('[ProgressStore] Failed to clear all progress:', error);
  }
}

/**
 * Check if IndexedDB is available and usable
 * Performs actual database access to catch private mode, quota, permissions
 */
export async function isIndexedDBAvailable(): Promise<boolean> {
  try {
    // Type check first
    if (typeof indexedDB === 'undefined') {
      console.log('[ProgressStore] IndexedDB not defined');
      return false;
    }

    // Probe: try to open a temporary database
    console.log('[ProgressStore] Testing IndexedDB availability...');
    const testDB = await openDB('__bold_test__', 1);
    await testDB.close();

    // Clean up test database
    indexedDB.deleteDatabase('__bold_test__');

    console.log('[ProgressStore] IndexedDB is available');
    return true;
  } catch (error) {
    console.log('[ProgressStore] IndexedDB test failed:', error);
    return false;
  }
}

/**
 * Synchronous availability check (type check only)
 * Use for initial render - async probe happens in effects
 */
export function isIndexedDBDefined(): boolean {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}
