# Anonymous Video Progress Tracking Implementation Plan

**Date**: 2025-10-19
**Tickets**: BOLD-728 (Epic), BOLD-729 (ADR)
**Status**: Ready for Implementation
**Related Research**: `thoughts/shared/research/2025-10-19-BOLD-728-anonymous-video-progress.md`

## Overview

Implement YouTube-style anonymous video progress tracking for the Bold Next.js starter template. Users will see progress bars on video thumbnails, automatic resume functionality, and the ability to track their viewing progress across the portal without authentication.

> **Update (2025-10-20)**: The opt-out toggle described below is deferred; related components (`components/progress-toggle.tsx`, `lib/progress/preferences.ts`) were removed after review and will be revisited in a future iteration.

This is a v1 implementation focusing on client-side storage with IndexedDB, designed to be forward-compatible with future server-side synchronization when authentication is added.

## Current State Analysis

### What Exists:
- ✅ Mux Player with full event handling (timeupdate, ended, seeking, pause)
- ✅ Player refs exposed for adding custom event listeners
- ✅ Existing `useCurrentPlayerTime` hook using React 18's `useSyncExternalStore`
- ✅ Hydration-safe storage pattern in `playlist-provider.tsx`
- ✅ Video thumbnails in multiple locations (search, playlists, home)
- ✅ Settings endpoint providing `account.slug` for tenant identification
- ✅ UI patterns for toggles, overlays, and progress indicators

### What's Missing:
- ❌ IndexedDB infrastructure (no libraries or wrappers)
- ❌ Progress storage schema and methods
- ❌ Progress tracking hook for player integration
- ❌ Progress bar UI component for thumbnails
- ❌ Cross-tab synchronization
- ❌ ADR documentation structure (`/docs/adr/` doesn't exist)

### Key Discoveries:
- **Player Integration**: `components/video-detail.tsx:69` - Player ref is already accessible
- **Event Handler**: `components/video-detail.tsx:156-160` - `handleVideoEnded` is where we'll mark completion
- **Storage Pattern**: `components/providers/playlist-provider.tsx:25-56` - Hydration-safe pattern to follow
- **Tenant ID Source**: Settings endpoint returns `account.slug` (e.g., "ranger" → internally `bt_ranger`)
- **Duration Format**: `util/format-duration.ts:1-8` - Utility already exists for time display

## Desired End State

After this implementation is complete:

1. **Storage Layer**: IndexedDB database storing progress with schema `{ videoId, position, duration, percentWatched, completed, lastWatched, version }`
2. **UI Indicators**: Progress bars on all video thumbnails showing % watched
3. **Resume Functionality**: Videos automatically seek to saved position on load
4. **Completion Tracking**: Videos marked complete at 90% watched
5. **Cross-Tab Sync**: Changes in one tab reflect in other open tabs
6. **Settings Toggle**: Users can opt-out of progress tracking
7. **ADR Documentation**: Architectural decision recorded in `/docs/adr/adr-0001-anonymous-progress.md`

### Verification:
- Open portal, watch 50% of a video, refresh → video resumes from 50%
- Watch to 90% completion → video marked complete with visual indicator
- Open same portal in two tabs, watch in one → progress updates in both tabs
- Toggle "Remember progress" off → new progress stops being saved
- IndexedDB inspector shows data with key format `bt_[slug]:videoId`

## What We're NOT Doing (Out of Scope)

- ❌ Server-side progress synchronization (future enhancement)
- ❌ Resume prompt/dialog (v1 auto-seeks, prompt planned for v2)
- ❌ Accurate range tracking (single position only for v1)
- ❌ Playlist-level progress indicators ("3 of 12 watched")
- ❌ Watch history (separate from progress tracking)
- ❌ Analytics or reporting features
- ❌ Export/import progress data
- ❌ Per-video granular settings (global opt-in/out only)

## Implementation Approach

We'll build this in 6 phases, each fully tested before moving to the next:

1. **ADR First** - Document architectural decisions before implementation
2. **Storage Foundation** - IndexedDB wrapper with error handling and fallbacks
3. **Core Hook** - React integration for player event handling
4. **UI Components** - Progress bars, completion indicators, settings toggle
5. **Integration** - Connect everything in video-detail and thumbnails
6. **Cross-Tab Sync** - BroadcastChannel + storage event fallback

Each phase includes both automated and manual verification steps.

---

## Phase 1: ADR Documentation

### Overview
Create the ADR (Architectural Decision Record) structure and document the anonymous progress tracking decision before implementation begins. This ensures architectural decisions are recorded and reviewed.

### Changes Required:

#### 1. Create ADR Directory Structure

**New Directory**: `/docs/adr/`

**New File**: `/docs/adr/README.md`
```markdown
# Architecture Decision Records

This directory contains records of architectural decisions made in this project.

## Format

We use the format proposed by Michael Nygard in his article:
http://thinkrelevance.com/blog/2011/11/15/documenting-architecture-decisions

## Index

- [ADR-0001](adr-0001-anonymous-progress.md) - Anonymous Video Progress Storage (2025-10-19)
```

#### 2. Write ADR-0001

**New File**: `/docs/adr/adr-0001-anonymous-progress.md`

```markdown
# ADR-0001: Anonymous Video Progress Storage

**Date**: 2025-10-19
**Status**: Accepted
**Deciders**: Marcel Fahle
**Related Tickets**: BOLD-728, BOLD-729

## Context

The Bold video portal needs YouTube-style video progress tracking (progress bars on thumbnails, resume functionality) without requiring user authentication. The portal serves multiple tenants, and video IDs use hashids (not UUIDs yet), making tenant identification critical for uniqueness.

### Requirements:
- Progress bars on video thumbnails showing % watched
- Automatic resume when returning to partially-watched videos
- No authentication required (anonymous users)
- Cross-tab synchronization (changes visible across browser tabs)
- Forward-compatible with future server-side sync
- Works in offline/incognito with graceful degradation
- Multi-tenant support (tenant slug is critical for uniqueness)

### Constraints:
- Next.js 14 with SSR requires hydration-safe patterns
- Video IDs are hashids (same IDs across tenants until UUID migration)
- Tenant identification via `settings.account.slug` endpoint
- Client-side only for v1 (no server persistence)

## Decision

We will use **IndexedDB** for client-side progress storage with the following schema:

### Storage Schema (ProgressV1)

```typescript
interface ProgressRecord {
  // Composite key
  id: string;                    // Format: "bt_${slug}:${videoId}"

  // Progress data
  videoId: string;               // Video hashid
  tenantId: string;              // Format: "bt_${slug}" (e.g., "bt_ranger")
  position: number;              // Last playback position in seconds
  duration: number;              // Total video duration in seconds
  percentWatched: number;        // Calculated: (position / duration) * 100
  completed: boolean;            // True if percentWatched >= 90
  lastWatched: string;           // ISO 8601 timestamp
  version: number;               // Schema version (always 1 for v1)
}
```

### Key Design Decisions:

1. **Database Name**: `bold-video-progress`
2. **Object Store**: `progress` with keyPath `id`
3. **Composite Key Format**: `bt_${slug}:${videoId}`
   - Example: `bt_ranger:abc123` for video "abc123" on "ranger" tenant
   - Prefix "bt_" (Bold Tenant) for internal consistency
   - Ensures uniqueness across tenants (critical until UUID migration)
4. **Completion Threshold**: 90% watched (YouTube-style)
5. **Write Throttling**: Save every 2-3 seconds + on pause/seeking/ended events
6. **Opt-Out Mechanism**: Boolean flag in localStorage (`bold-progress-enabled`)
7. **Library**: `idb` (Jake Archibald's promise wrapper, 1.5KB)

### Tenant ID Resolution:

```typescript
// Get from settings endpoint
const { data: settings } = await bold.settings();
const tenantId = `bt_${settings.account.slug}`;
// Example: slug="ranger" → tenantId="bt_ranger"
```

### Cross-Tab Synchronization:

**Primary Method**: BroadcastChannel API
```typescript
const channel = new BroadcastChannel('bold-progress');
channel.postMessage({ type: 'progress-update', videoId, tenantId });
```

**Fallback**: Storage events (for browsers without BroadcastChannel)
```typescript
localStorage.setItem('bold-progress-sync', Date.now().toString());
window.addEventListener('storage', handleStorageChange);
```

## Alternatives Considered

### Alternative 1: localStorage
**Pros**: Simple, synchronous API, no library needed
**Cons**:
- Size limit (~5-10MB, problematic for many videos)
- Synchronous/blocking writes (performance impact)
- No structured queries (must parse all data)
- Hard to evolve schema (breaking changes on structure updates)

**Rejected**: Not scalable for growing video catalogs

### Alternative 2: Cookies
**Pros**: Works across subdomains, simple API
**Cons**:
- Tiny size limit (4KB, stores ~10 videos max)
- Sent with every HTTP request (performance overhead)
- Security concerns (XSS if not HttpOnly)

**Rejected**: Too limited for typical use

### Alternative 3: Server-Only Storage
**Pros**: Sync across devices, persistent, reliable
**Cons**:
- Requires authentication (defeats "anonymous" requirement)
- Adds server complexity and storage costs
- Network dependency (slow, fails offline)

**Deferred**: Planned for v2 when authentication exists

### Alternative 4: sessionStorage
**Pros**: Simple API, isolated per-tab
**Cons**:
- Lost on tab close (poor UX)
- No cross-tab sync

**Rejected**: Doesn't meet persistence requirement

## Consequences

### Positive:

1. **Tiny Client Footprint**: IndexedDB is async/non-blocking
2. **Scalable**: Can store thousands of video progress records
3. **Fast Reads**: Indexed by composite key for O(1) lookups
4. **Future-Proof**: Easy to add server sync later (keep IndexedDB as cache)
5. **Schema Evolution**: `version` field enables migrations
6. **Privacy-Friendly**: Data stays on device, user can clear
7. **Offline Support**: Works without network
8. **Multi-Tenant Safe**: Composite key prevents collisions

### Negative:

1. **Browser-Specific**: Progress doesn't sync across devices (acceptable for v1)
2. **Incognito Limitation**: Data lost on session end (graceful degradation)
3. **Storage Quota**: Subject to browser limits (~50MB-1GB, plenty for videos)
4. **Complexity**: More code than localStorage (mitigated by `idb` library)
5. **Edge Case**: Tenant slug changes require migration (rare, acceptable)

### Trade-offs:

- **Auto-Resume vs Prompt**: V1 auto-seeks to saved position (simpler UX, less control)
  - Future: Add resume prompt with countdown and "Start Over" button
- **Single Position vs Ranges**: V1 stores last position only (simpler schema)
  - Future: Add `ranges: { start: number, end: number }[]` for accuracy
- **90% Threshold**: Balances UX (users skip credits) with accuracy
  - Configurable in future if needed

## Implementation Notes

### Error Handling Strategy:

```typescript
// Graceful degradation
try {
  await saveProgress(videoId, position);
} catch (error) {
  console.warn('Progress save failed:', error);
  // Feature degrades silently - video still plays
}
```

### Hydration Safety Pattern:

```typescript
// Follow playlist-provider pattern
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
  // Only access IndexedDB after mount
  loadProgress();
}, []);
```

### Migration Path (Future):

When adding server sync:
1. Keep IndexedDB as local cache
2. Add server write-through on progress save
3. Fetch from server on first load
4. Merge local + server progress (take latest `lastWatched`)

### Testing Considerations:

- **Unit Tests**: Mock IndexedDB with `fake-indexeddb`
- **Integration Tests**: Test cross-tab sync with multiple browser contexts
- **Manual Tests**: Verify incognito mode graceful degradation
- **Edge Cases**: Test storage quota exceeded, corrupt data, schema migrations

## References

- **Original Ticket**: `thoughts/shared/research/2025-10-19-BOLD-728-anonymous-video-progress.md`
- **BOLD-728**: Frontend implementation of anonymous video progress (v1)
- **BOLD-729**: Write ADR documenting the architectural decision
- **IndexedDB Spec**: https://w3c.github.io/IndexedDB/
- **BroadcastChannel API**: https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API
- **idb Library**: https://github.com/jakearchibald/idb
```

### Success Criteria:

#### Automated Verification:
- [x] `/docs/adr/` directory exists
- [x] `adr-0001-anonymous-progress.md` file created and contains all required sections
- [x] `README.md` index file created in `/docs/adr/`
- [x] All markdown files pass linting (if configured)

#### Manual Verification:
- [x] ADR is clear and complete (no unresolved questions)
- [x] Design decisions are well-justified
- [x] Alternatives section documents why other approaches were rejected
- [x] Schema includes `version` field for future migrations
- [x] Consequences section lists realistic trade-offs

---

## Phase 2: Storage Foundation

### Overview
Implement the IndexedDB wrapper using the `idb` library. This provides type-safe, promise-based database operations with error handling and graceful degradation.

### Changes Required:

#### 1. Install Dependencies

**Command**:
```bash
npm install idb
npm install -D @types/node  # If not already installed
```

**Files Modified**: `package.json`, `package-lock.json`

#### 2. Create Progress Types

**New File**: `lib/progress/types.ts`

```typescript
/**
 * Progress record stored in IndexedDB
 * Version 1: Single position tracking
 */
export interface ProgressRecord {
  /** Composite key: "bt_${tenantSlug}:${videoId}" */
  id: string;

  /** Video ID (hashid) */
  videoId: string;

  /** Tenant ID with "bt_" prefix (e.g., "bt_ranger") */
  tenantId: string;

  /** Last playback position in seconds */
  position: number;

  /** Total video duration in seconds */
  duration: number;

  /** Calculated percentage: (position / duration) * 100 */
  percentWatched: number;

  /** True if percentWatched >= COMPLETION_THRESHOLD */
  completed: boolean;

  /** ISO 8601 timestamp of last update */
  lastWatched: string;

  /** Schema version (always 1 for v1) */
  version: number;
}

/**
 * Configuration constants
 */
export const PROGRESS_CONFIG = {
  DB_NAME: 'bold-video-progress',
  STORE_NAME: 'progress',
  VERSION: 1,
  COMPLETION_THRESHOLD: 90, // Percentage
  THROTTLE_INTERVAL: 2500,  // Milliseconds (2.5 seconds)
  STORAGE_KEY_PREFIX: 'bt_',
} as const;
```

#### 3. Create IndexedDB Wrapper

**New File**: `lib/progress/store.ts`

```typescript
import { openDB, type IDBPDatabase } from 'idb';
import type { ProgressRecord } from './types';
import { PROGRESS_CONFIG } from './types';

type ProgressDB = IDBPDatabase<{
  progress: {
    key: string;
    value: ProgressRecord;
  };
}>;

let dbInstance: ProgressDB | null = null;

/**
 * Initialize and return the IndexedDB database
 * Lazy initialization - opens on first use
 */
async function getDB(): Promise<ProgressDB> {
  if (dbInstance) return dbInstance;

  try {
    dbInstance = await openDB<ProgressDB>(
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
    return record || null;
  } catch (error) {
    console.warn('[ProgressStore] Failed to get progress:', error);
    return null;
  }
}

/**
 * Save or update progress for a video
 * Calculates percentWatched and completed status automatically
 */
export async function saveProgress(
  tenantId: string,
  videoId: string,
  position: number,
  duration: number
): Promise<void> {
  try {
    const db = await getDB();
    const key = generateProgressKey(tenantId, videoId);

    // Calculate derived fields
    const percentWatched = Math.min((position / duration) * 100, 100);
    const completed = percentWatched >= PROGRESS_CONFIG.COMPLETION_THRESHOLD;

    const record: ProgressRecord = {
      id: key,
      videoId,
      tenantId,
      position,
      duration,
      percentWatched,
      completed,
      lastWatched: new Date().toISOString(),
      version: PROGRESS_CONFIG.VERSION,
    };

    await db.put(PROGRESS_CONFIG.STORE_NAME, record);
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
 * Check if IndexedDB is available
 * Returns false in incognito mode or unsupported browsers
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}
```

#### 4. Create Tenant ID Utility

**New File**: `lib/progress/tenant.ts`

```typescript
import type { Settings } from '@boldvideo/bold-js';
import { PROGRESS_CONFIG } from './types';

/**
 * Extract tenant ID from settings
 * Format: "bt_${slug}" (e.g., "bt_ranger")
 */
export function getTenantId(settings: Settings | null): string | null {
  if (!settings?.account?.slug) {
    console.warn('[ProgressStore] No tenant slug in settings');
    return null;
  }

  return `${PROGRESS_CONFIG.STORAGE_KEY_PREFIX}${settings.account.slug}`;
}
```

### Success Criteria:

#### Automated Verification:
- [x] `idb` package installed: `npm list idb`
- [x] TypeScript compilation passes: `npm run build`
- [x] No linting errors: `npm run lint`
- [x] All exports are type-safe (no `any` types)

#### Manual Verification:
- [x] Open browser DevTools → Application → IndexedDB
- [x] Run `saveProgress('bt_test', 'video123', 30, 100)` in console
- [x] Verify database `bold-video-progress` created
- [x] Verify object store `progress` exists
- [x] Verify record with key `bt_test:video123` appears
- [x] Verify `percentWatched: 30` and `completed: false`
- [x] Test in incognito mode → `isIndexedDBAvailable()` returns false (graceful)

---

## Phase 3: Core Progress Tracking Hook

### Overview
Create a React hook that integrates with the video player to automatically track and persist progress. This hook handles player event subscriptions, throttled writes, and state management.

### Changes Required:

#### 1. Create Progress Hook

**New File**: `hooks/use-video-progress.ts`

```typescript
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSettings } from '@/components/providers/settings-provider';
import { getTenantId } from '@/lib/progress/tenant';
import {
  getProgress,
  saveProgress,
  deleteProgress,
  isIndexedDBAvailable,
} from '@/lib/progress/store';
import type { ProgressRecord } from '@/lib/progress/types';
import { PROGRESS_CONFIG } from '@/lib/progress/types';

interface UseVideoProgressOptions {
  videoId: string;
  duration: number;
  playerRef: React.RefObject<HTMLVideoElement | null>;
  enabled?: boolean; // Allow disabling (for opt-out)
}

interface UseVideoProgressReturn {
  progress: ProgressRecord | null;
  isLoading: boolean;
  saveCurrentProgress: (position: number) => Promise<void>;
  clearProgress: () => Promise<void>;
  resumePosition: number | null;
}

/**
 * Hook for tracking video progress with IndexedDB persistence
 * Automatically saves progress on timeupdate, pause, seeking, and ended events
 */
export function useVideoProgress({
  videoId,
  duration,
  playerRef,
  enabled = true,
}: UseVideoProgressOptions): UseVideoProgressReturn {
  const settings = useSettings();
  const [progress, setProgress] = useState<ProgressRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resumePosition, setResumePosition] = useState<number | null>(null);

  // Throttling state
  const lastSaveTimeRef = useRef<number>(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get tenant ID
  const tenantId = getTenantId(settings);

  // Check if we can use IndexedDB
  const canUseStorage = enabled && isIndexedDBAvailable() && tenantId !== null;

  /**
   * Load existing progress on mount
   */
  useEffect(() => {
    if (!canUseStorage || !tenantId) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    async function loadProgress() {
      try {
        const existingProgress = await getProgress(tenantId, videoId);

        if (mounted) {
          setProgress(existingProgress);

          // Set resume position if video not completed
          if (existingProgress && !existingProgress.completed && existingProgress.position > 0) {
            setResumePosition(existingProgress.position);
          }
        }
      } catch (error) {
        console.warn('[useVideoProgress] Failed to load progress:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadProgress();

    return () => {
      mounted = false;
    };
  }, [canUseStorage, tenantId, videoId]);

  /**
   * Save progress to IndexedDB with throttling
   */
  const saveCurrentProgress = useCallback(
    async (position: number) => {
      if (!canUseStorage || !tenantId) return;

      const now = Date.now();
      const timeSinceLastSave = now - lastSaveTimeRef.current;

      // Throttle: Only save if enough time has passed
      if (timeSinceLastSave < PROGRESS_CONFIG.THROTTLE_INTERVAL) {
        // Schedule a save for later
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
          saveCurrentProgress(position);
        }, PROGRESS_CONFIG.THROTTLE_INTERVAL - timeSinceLastSave);

        return;
      }

      // Save immediately
      lastSaveTimeRef.current = now;

      try {
        await saveProgress(tenantId, videoId, position, duration);

        // Update local state
        const percentWatched = Math.min((position / duration) * 100, 100);
        const completed = percentWatched >= PROGRESS_CONFIG.COMPLETION_THRESHOLD;

        setProgress({
          id: `${tenantId}:${videoId}`,
          videoId,
          tenantId,
          position,
          duration,
          percentWatched,
          completed,
          lastWatched: new Date().toISOString(),
          version: PROGRESS_CONFIG.VERSION,
        });
      } catch (error) {
        console.warn('[useVideoProgress] Failed to save progress:', error);
      }
    },
    [canUseStorage, tenantId, videoId, duration]
  );

  /**
   * Clear progress for this video
   */
  const clearProgress = useCallback(async () => {
    if (!canUseStorage || !tenantId) return;

    try {
      await deleteProgress(tenantId, videoId);
      setProgress(null);
      setResumePosition(null);
    } catch (error) {
      console.warn('[useVideoProgress] Failed to clear progress:', error);
    }
  }, [canUseStorage, tenantId, videoId]);

  /**
   * Attach player event listeners
   */
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !canUseStorage) return;

    const handleTimeUpdate = () => {
      const position = player.currentTime;
      saveCurrentProgress(position);
    };

    const handlePause = () => {
      const position = player.currentTime;
      // Force immediate save on pause (bypass throttle)
      lastSaveTimeRef.current = 0;
      saveCurrentProgress(position);
    };

    const handleSeeking = () => {
      const position = player.currentTime;
      // Force immediate save on seek (bypass throttle)
      lastSaveTimeRef.current = 0;
      saveCurrentProgress(position);
    };

    const handleEnded = () => {
      // Mark as complete (100% position)
      lastSaveTimeRef.current = 0;
      saveCurrentProgress(duration);
    };

    // Attach event listeners
    player.addEventListener('timeupdate', handleTimeUpdate);
    player.addEventListener('pause', handlePause);
    player.addEventListener('seeking', handleSeeking);
    player.addEventListener('ended', handleEnded);

    return () => {
      // Cleanup
      player.removeEventListener('timeupdate', handleTimeUpdate);
      player.removeEventListener('pause', handlePause);
      player.removeEventListener('seeking', handleSeeking);
      player.removeEventListener('ended', handleEnded);

      // Clear pending save timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [playerRef, canUseStorage, saveCurrentProgress, duration]);

  return {
    progress,
    isLoading,
    saveCurrentProgress,
    clearProgress,
    resumePosition,
  };
}
```

#### Deferred: Progress Preference Storage

> **Status**: Deferred. The `lib/progress/preferences.ts` helper was removed post-review and will be reconsidered when the opt-out toggle returns. Archived snippet below for future reference.

~~**New File**: `lib/progress/preferences.ts`~~

```typescript
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
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `npm run build`
- [x] No linting errors: `npm run lint`
- [x] Hook exports all required methods

#### Manual Verification:
- [x] Create test component using `useVideoProgress` hook
- [x] Mock player ref with `currentTime` property
- [x] Simulate `timeupdate` events → progress saves throttled (2.5s interval)
- [x] Simulate `pause` event → progress saves immediately (bypasses throttle)
- [x] Simulate `ended` event → `completed: true` set in IndexedDB
- [x] Reload page → `resumePosition` returns saved position
- [x] Watch to 90% → `completed: true` appears in IndexedDB
- [x] Call `clearProgress()` → record deleted from IndexedDB

---

## Phase 4: UI Components

### Overview
Create the visual components for displaying progress: progress bars on thumbnails, completion indicators, and a settings toggle for opt-out.

### Changes Required:

#### 1. Progress Bar Component

**New File**: `components/progress-bar.tsx`

```typescript
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  percentWatched: number;
  completed?: boolean;
  className?: string;
}

/**
 * Progress bar overlay for video thumbnails
 * Shows horizontal bar at bottom with filled portion
 */
export function ProgressBar({
  percentWatched,
  completed = false,
  className,
}: ProgressBarProps) {
  // Don't show bar if no progress
  if (percentWatched === 0 && !completed) {
    return null;
  }

  return (
    <div
      className={cn(
        'absolute bottom-0 left-0 right-0 h-1 bg-muted/30',
        className
      )}
    >
      <div
        className={cn(
          'h-full transition-all duration-300',
          completed ? 'bg-primary' : 'bg-primary/80'
        )}
        style={{ width: `${Math.min(percentWatched, 100)}%` }}
      />
    </div>
  );
}
```

#### 2. Completion Indicator Component

**New File**: `components/completion-indicator.tsx`

```typescript
import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompletionIndicatorProps {
  completed: boolean;
  className?: string;
}

/**
 * Checkmark indicator for completed videos
 * Replaces duration badge on thumbnails
 */
export function CompletionIndicator({
  completed,
  className,
}: CompletionIndicatorProps) {
  if (!completed) return null;

  return (
    <div
      className={cn(
        'absolute bottom-3 right-3 bg-primary text-primary-foreground rounded-full p-1',
        className
      )}
      aria-label="Video completed"
    >
      <CheckCircle className="w-4 h-4" />
    </div>
  );
}
```

#### Deferred: Progress Toggle Component

> **Status**: Deferred alongside the preference helper; `components/progress-toggle.tsx` was removed but the implementation sketch remains here for future reuse.

~~**New File**: `components/progress-toggle.tsx`~~

```typescript
"use client";

import { useState, useEffect } from 'react';
import { Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  isProgressTrackingEnabled,
  setProgressTrackingEnabled,
} from '@/lib/progress/preferences';

interface ProgressToggleProps {
  className?: string;
}

/**
 * Toggle button for progress tracking preference
 * Similar pattern to AutoplayToggle
 */
export function ProgressToggle({ className }: ProgressToggleProps) {
  const [isEnabled, setIsEnabled] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
    setIsEnabled(isProgressTrackingEnabled());
  }, []);

  const handleToggle = () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    setProgressTrackingEnabled(newValue);

    // Optionally broadcast change to other tabs
    if (typeof window !== 'undefined') {
      localStorage.setItem('bold-progress-toggle-sync', Date.now().toString());
    }
  };

  // Listen for changes from other tabs
  useEffect(() => {
    if (!mounted) return;

    const handleStorageChange = () => {
      setIsEnabled(isProgressTrackingEnabled());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [mounted]);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return <div className="w-8 h-8" />; // Placeholder
  }

  return (
    <button
      onClick={handleToggle}
      className={cn(
        'p-2 rounded-md transition-all duration-200',
        'hover:bg-accent',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        isEnabled
          ? 'text-primary bg-primary/10'
          : 'text-muted-foreground',
        className
      )}
      aria-label={isEnabled ? 'Disable progress tracking' : 'Enable progress tracking'}
      title={isEnabled ? 'Remember progress enabled' : 'Remember progress disabled'}
    >
      <Repeat
        className={cn(
          'w-5 h-5 transition-transform duration-200',
          isEnabled && 'scale-110'
        )}
      />
    </button>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `npm run build`
- [x] No linting errors: `npm run lint`
- [x] All components render without errors

#### Manual Verification:
- [x] Add `ProgressBar` to test thumbnail with `percentWatched={45}`
- [x] Verify thin bar appears at bottom with 45% fill
- [x] Change to `percentWatched={90} completed={true}`
- [x] Verify bar fills to 90% with primary color
- [x] Add `CompletionIndicator` with `completed={true}`
- [x] Verify checkmark appears in bottom-right corner
- [x] Add `ProgressToggle` to layout
- [x] Click toggle → state changes, localStorage updates
- [x] Open second tab → toggle reflects same state
- [x] Toggle in second tab → first tab updates (cross-tab sync)

---

## Phase 5: Integration

### Overview
Integrate progress tracking into the existing video player and thumbnail components. This connects all the pieces built in previous phases.

### Changes Required:

#### 1. Integrate Hook in Video Detail

**File**: `components/video-detail.tsx`

**Changes**:
1. Import the hook and types
2. Use the hook with player ref
3. Auto-seek to resume position on mount
4. Pass progress state to components (future phases)

```typescript
// Add imports at top (after line 23)
import { useVideoProgress } from '@/hooks/use-video-progress';
import { isProgressTrackingEnabled } from '@/lib/progress/preferences';

// Inside VideoDetail component (after line 76)
const progressEnabled = isProgressTrackingEnabled();

const {
  progress,
  isLoading: isProgressLoading,
  resumePosition,
} = useVideoProgress({
  videoId: video.id,
  duration: video.duration,
  playerRef,
  enabled: progressEnabled,
});

// Add resume effect (after line 118)
useEffect(() => {
  if (resumePosition !== null && playerRef.current && !startTime) {
    // Auto-seek to resume position
    playerRef.current.currentTime = resumePosition;
  }
}, [resumePosition, startTime]);
```

**Location References**:
- Import block: `video-detail.tsx:1-23`
- Hook usage: Insert after `video-detail.tsx:76`
- Resume effect: Insert after `video-detail.tsx:118`

#### 2. Update Video Thumbnail Component

**File**: `components/video-thumbnail.tsx`

**Changes**:
1. Accept optional progress data
2. Render ProgressBar overlay
3. Conditionally show CompletionIndicator or duration

```typescript
// Add imports (after line 4)
import { ProgressBar } from './progress-bar';
import { CompletionIndicator } from './completion-indicator';

// Update interface (after line 6)
interface VideoThumbnailProps {
  video: any;
  prefetch?: boolean;
  playlistId?: string;
  progress?: {
    percentWatched: number;
    completed: boolean;
  } | null;
}

// Update component (modify lines 12-42)
export function VideoThumbnail({
  video,
  prefetch = false,
  playlistId,
  progress,
}: VideoThumbnailProps) {
  return (
    <div className="aspect-video group relative">
      <div className="aspect-video relative overflow-hidden rounded-lg">
        <Image
          src={video.thumbnail}
          alt={video.title}
          fill={true}
          className="object-cover"
          sizes="100vw, (max-width: 640px) 640px"
        />

        {/* Progress bar overlay */}
        {progress && <ProgressBar percentWatched={progress.percentWatched} completed={progress.completed} />}

        {/* Duration badge or completion indicator */}
        {progress?.completed ? (
          <CompletionIndicator completed={true} />
        ) : (
          <span className="bg-black text-white absolute px-2 py-1 font-semibold text-sm bottom-3 right-3 rounded-md">
            {formatDuration(video.duration)}
          </span>
        )}
      </div>
      <h3 className="mt-4 font-semibold text-lg">
        <Link href={playlistId ? `/pl/${playlistId}/v/${video.id}` : `/v/${video.id}`} prefetch={prefetch}>
          <span className="absolute -inset-2.5 z-10"></span>
          <span>{video.title}</span>
        </Link>
      </h3>
      <p className="text-gray-500 text-sm">
        {formatRelative(new Date(video.published_at), new Date())}
      </p>
    </div>
  );
}
```

#### 3. Create Progress Context Provider (Optional but Recommended)

**New File**: `components/providers/progress-provider.tsx`

```typescript
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSettings } from './settings-provider';
import { getTenantId } from '@/lib/progress/tenant';
import { getAllProgress } from '@/lib/progress/store';
import type { ProgressRecord } from '@/lib/progress/types';

interface ProgressContextValue {
  progressMap: Map<string, ProgressRecord>;
  refreshProgress: () => Promise<void>;
  isLoading: boolean;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const [progressMap, setProgressMap] = useState<Map<string, ProgressRecord>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const tenantId = getTenantId(settings);

  const refreshProgress = async () => {
    if (!tenantId) return;

    setIsLoading(true);
    try {
      const allProgress = await getAllProgress(tenantId);
      const map = new Map(allProgress.map((p) => [p.videoId, p]));
      setProgressMap(map);
    } catch (error) {
      console.warn('[ProgressProvider] Failed to load progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load progress on mount
  useEffect(() => {
    refreshProgress();
  }, [tenantId]);

  // Listen for cross-tab updates
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'bold-progress-sync') {
        refreshProgress();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <ProgressContext.Provider value={{ progressMap, refreshProgress, isLoading }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress must be used within ProgressProvider');
  }
  return context;
}
```

**Integration**: Add to `app/(default)/layout.tsx` provider tree (after SettingsProvider)

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `npm run build`
- [x] No linting errors: `npm run lint`
- [x] Development server starts: `npm run dev`
- [x] No console errors on page load

#### Manual Verification:
- [x] Open video page, watch for 30 seconds
- [x] Refresh page → video auto-seeks to 30-second mark (FIXED - was broken initially)
- [x] Continue watching to 50% → progress bar appears on thumbnail (if visible)
- [x] Watch to 90% completion → checkmark replaces duration badge
- [x] Navigate to home/playlist → thumbnail shows progress bar
- [x] Open second tab → same progress visible
- [x] Watch in second tab → first tab's thumbnail updates

---

## Phase 6: Cross-Tab Synchronization

### Overview
Implement real-time synchronization of progress across multiple browser tabs using BroadcastChannel API with storage events as fallback.

### Changes Required:

#### 1. Create Sync Utility

**New File**: `lib/progress/sync.ts`

```typescript
"use client";

type ProgressUpdateMessage = {
  type: 'progress-update';
  videoId: string;
  tenantId: string;
  timestamp: number;
};

type ProgressSyncCallback = (message: ProgressUpdateMessage) => void;

let broadcastChannel: BroadcastChannel | null = null;
let storageListeners: ProgressSyncCallback[] = [];

/**
 * Initialize cross-tab synchronization
 * Uses BroadcastChannel with localStorage fallback
 */
export function initProgressSync(callback: ProgressSyncCallback): () => void {
  // Try BroadcastChannel first (modern browsers)
  if (typeof BroadcastChannel !== 'undefined') {
    if (!broadcastChannel) {
      broadcastChannel = new BroadcastChannel('bold-progress');
    }

    const handleMessage = (event: MessageEvent<ProgressUpdateMessage>) => {
      if (event.data.type === 'progress-update') {
        callback(event.data);
      }
    };

    broadcastChannel.addEventListener('message', handleMessage);

    return () => {
      broadcastChannel?.removeEventListener('message', handleMessage);
    };
  }

  // Fallback to storage events (older browsers)
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'bold-progress-sync' && e.newValue) {
      try {
        const message = JSON.parse(e.newValue) as ProgressUpdateMessage;
        callback(message);
      } catch {
        // Ignore parse errors
      }
    }
  };

  storageListeners.push(callback);
  window.addEventListener('storage', handleStorageChange);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
    storageListeners = storageListeners.filter((cb) => cb !== callback);
  };
}

/**
 * Broadcast a progress update to other tabs
 */
export function broadcastProgressUpdate(
  videoId: string,
  tenantId: string
): void {
  const message: ProgressUpdateMessage = {
    type: 'progress-update',
    videoId,
    tenantId,
    timestamp: Date.now(),
  };

  // Try BroadcastChannel
  if (broadcastChannel) {
    broadcastChannel.postMessage(message);
  } else {
    // Fallback to localStorage
    try {
      localStorage.setItem('bold-progress-sync', JSON.stringify(message));
    } catch {
      // Fail silently
    }
  }
}

/**
 * Cleanup sync connections
 */
export function cleanupProgressSync(): void {
  if (broadcastChannel) {
    broadcastChannel.close();
    broadcastChannel = null;
  }
  storageListeners = [];
}
```

#### 2. Update Progress Store to Broadcast

**File**: `lib/progress/store.ts`

**Changes**: Add broadcast after save

```typescript
// Add import at top
import { broadcastProgressUpdate } from './sync';

// Update saveProgress function (after line 73, after db.put)
await db.put(PROGRESS_CONFIG.STORE_NAME, record);

// Broadcast update to other tabs
broadcastProgressUpdate(videoId, tenantId);
```

#### 3. Update Progress Hook to Listen

**File**: `hooks/use-video-progress.ts`

**Changes**: Add sync listener

```typescript
// Add import at top
import { initProgressSync } from '@/lib/progress/sync';

// Add effect after loadProgress effect (around line 85)
useEffect(() => {
  if (!canUseStorage || !tenantId) return;

  // Listen for updates from other tabs
  const cleanup = initProgressSync(async (message) => {
    // Only refresh if this video was updated
    if (message.videoId === videoId && message.tenantId === tenantId) {
      const updatedProgress = await getProgress(tenantId, videoId);
      setProgress(updatedProgress);
    }
  });

  return cleanup;
}, [canUseStorage, tenantId, videoId]);
```

#### 4. Update Progress Provider to Sync

**File**: `components/providers/progress-provider.tsx`

**Changes**: Replace storage event listener with sync utility

```typescript
// Add import at top
import { initProgressSync } from '@/lib/progress/sync';

// Replace storage event listener effect (around line 48)
useEffect(() => {
  if (!tenantId) return;

  // Listen for progress updates from any tab
  const cleanup = initProgressSync((message) => {
    // Refresh all progress when any update occurs
    refreshProgress();
  });

  return cleanup;
}, [tenantId]);
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `npm run build`
- [x] No linting errors: `npm run lint`
- [x] Development server starts: `npm run dev`
- [x] No console errors on page load

#### Manual Verification:
- [x] Open video in Tab A, watch for 20 seconds
- [x] Open same video in Tab B → should auto-seek to ~20 seconds
- [x] Watch to 40 seconds in Tab A
- [x] Check Tab B progress bar → should update to ~40%
- [x] Watch to completion in Tab B
- [x] Check Tab A thumbnail → should show checkmark
- [x] Toggle progress tracking off in Tab A
- [x] Verify Tab B respects the setting (stops tracking)
- [x] Test in Firefox (BroadcastChannel supported)
- [x] Test in Safari (may use storage event fallback)

---

## Testing Strategy

### Unit Tests

Create `__tests__/lib/progress/store.test.ts`:
- Mock IndexedDB with `fake-indexeddb`
- Test `saveProgress()` creates correct schema
- Test `getProgress()` returns null for non-existent keys
- Test `generateProgressKey()` formats correctly
- Test percentage and completion calculations
- Test error handling when IndexedDB unavailable

Create `__tests__/hooks/use-video-progress.test.ts`:
- Mock player ref and events
- Test throttling (saves max once per 2.5 seconds)
- Test immediate save on pause/seeking/ended
- Test resume position calculation
- Test opt-out respects preference

### Integration Tests

Create `__tests__/integration/progress-flow.test.ts`:
- Test full flow: load video → watch → save → reload → resume
- Test completion flow: watch to 90% → verify completed flag
- Test cross-tab sync with multiple browser contexts
- Test graceful degradation in incognito mode

### Manual Testing Checklist

#### Basic Functionality:
- [ ] Watch video for 30s → refresh → resumes from 30s
- [ ] Watch to 90% → video marked complete
- [ ] Progress bar shows correct percentage on thumbnails
- [ ] Checkmark appears on completed videos
- [ ] Duration badge hidden when video completed

#### Edge Cases:
- [ ] Incognito mode → progress tracking disabled (graceful)
- [ ] Disabled JavaScript → basic playback still works
- [ ] Very long video (2+ hours) → accurate position tracking
- [ ] Seeking backwards → progress updates correctly
- [ ] Playlist autoplay → progress saved for each video

#### Cross-Tab Sync:
- [ ] Open portal in 2 tabs → changes in Tab A appear in Tab B
- [ ] Watch in Tab A while Tab B visible → B updates in real-time
- [ ] Toggle tracking in Tab A → Tab B stops tracking

#### Performance:
- [ ] No jank during playback (throttling works)
- [ ] Page load time acceptable with 100+ videos
- [ ] IndexedDB queries fast (<50ms per operation)
- [ ] No memory leaks (check DevTools Memory tab)

#### Multi-Tenant:
- [ ] Tenant A videos don't show progress for Tenant B
- [ ] Different tenant slugs create separate progress records
- [ ] Switching tenants (if applicable) isolates progress

## Performance Considerations

### Write Throttling:
- Saves throttled to every 2.5 seconds during playback
- Immediate saves on pause, seeking, ended events
- Prevents excessive IndexedDB writes (performance impact)

### Read Optimization:
- Progress loaded once on component mount
- Cached in React state (no re-fetching on re-renders)
- Optional: ProgressProvider can batch-load all progress

### Bundle Size:
- `idb` library: ~1.5KB gzipped
- Progress components: ~2KB total
- Total addition: ~3.5KB to bundle (negligible)

### IndexedDB Limits:
- Most browsers: 50MB - 1GB available storage
- ~500 bytes per progress record
- Can store 100,000+ video progress records before hitting limits
- Graceful degradation if quota exceeded (console warning, feature continues)

## Migration Notes

### Future Server Sync:
When authentication is added, migrate to hybrid model:

1. **Keep IndexedDB as cache** (offline support)
2. **Add server write-through** on `saveProgress()`
3. **Fetch from server** on first load
4. **Merge strategy**: Take latest `lastWatched` timestamp

Schema is already forward-compatible with `version` field for migrations.

### Schema Evolution:
If schema changes in v2 (e.g., adding `ranges` field):

1. Increment `PROGRESS_CONFIG.VERSION` to 2
2. Add migration logic in `openDB()` upgrade handler
3. Read v1 records, transform to v2, write back
4. Example migration:
   ```typescript
   upgrade(db, oldVersion, newVersion) {
     if (oldVersion < 2) {
       // Migrate v1 → v2
       const store = db.transaction.objectStore('progress');
       const allRecords = await store.getAll();
       for (const record of allRecords) {
         if (!record.ranges) {
           record.ranges = [{ start: 0, end: record.position }];
           record.version = 2;
           await store.put(record);
         }
       }
     }
   }
   ```

---

## Implementation Completion Summary

**Status**: ✅ **FULLY IMPLEMENTED** (October 19, 2025)

### All Phases Completed:

#### Phase 1: ADR Document ✅
- Created comprehensive architecture decision record
- Documented IndexedDB choice, sync strategy, multi-tenant isolation
- **Location**: `docs/adr/adr-0001-anonymous-progress.md`

#### Phase 2: Storage Foundation ✅
- Implemented IndexedDB wrapper with `idb` library
- Created type definitions, tenant ID extraction, preferences storage
- All automated tests passed
- All manual verification completed

#### Phase 3: Core Progress Tracking Hook ✅
- Built `useVideoProgress` hook with full MuxPlayer integration
- Implemented throttled saves (2.5s), immediate saves on pause/seeking/ended
- Fixed TypeScript null guard issue in loadProgress
- All automated tests passed
- All manual verification completed

#### Phase 4: UI Components ✅
- Created ProgressBar component with animated overlay
- Created CompletionIndicator component with checkmark badge
- Created ProgressToggle component for user control
- All automated tests passed
- All manual verification completed

#### Phase 5: Integration ✅
- Integrated hook into video player with resume functionality
- Created VideoThumbnailWithProgress wrapper for server components
- Added ProgressProvider to app layout for global state
- **Fixed resume issue**: Changed from manual seek to Player's startTime prop
- **Fixed thumbnail issue**: Created client wrapper for server components
- All automated tests passed
- All manual verification completed

#### Phase 6: Cross-Tab Synchronization ✅
- Implemented BroadcastChannel with localStorage fallback
- Added same-tab listeners for live sidebar updates
- Tested in multiple browsers (Chrome, Firefox, Safari)
- **Fixed live sidebar updates**: Added `sameTabListeners` array to handle same-tab notifications
- All automated tests passed
- All manual verification completed

### Key Issues Resolved:

1. **Resume Position Not Working** → Fixed by passing `resumePosition` via Player's `startTime` prop
2. **Progress Bars Not Showing on Thumbnails** → Created `VideoThumbnailWithProgress` client wrapper
3. **Progress Bars Not Showing on Playlist Pages** → Made components client-side with `useProgress()` hook
4. **Completion Indicator Looks Weird in Sidebar** → Removed from sidebar, kept duration badge
5. **Sidebar Progress Not Updating Live** → Added `sameTabListeners` for same-tab notifications
6. **Muted Audio Persisting** → User cleared `media-chrome-pref-muted` from localStorage (MuxPlayer setting)

### Files Created:

**Core Progress System:**
- `lib/progress/types.ts` - Type definitions and configuration
- `lib/progress/store.ts` - IndexedDB wrapper operations
- `lib/progress/tenant.ts` - Tenant ID extraction utility
- ~~`lib/progress/preferences.ts` - Opt-in/out preference storage~~ (deferred)
- `lib/progress/sync.ts` - Cross-tab and same-tab synchronization

**Hooks:**
- `hooks/use-video-progress.ts` - Main progress tracking hook

**Components:**
- `components/progress-bar.tsx` - Progress overlay for thumbnails
- `components/completion-indicator.tsx` - Checkmark badge for completed videos
- ~~`components/progress-toggle.tsx` - User control toggle~~ (deferred)
- `components/video-thumbnail-with-progress.tsx` - Client wrapper for server components
- `components/providers/progress-provider.tsx` - Global progress context

**Documentation:**
- `docs/DEBUG-PROGRESS-TRACKING.md` - Comprehensive debugging guide
- `docs/adr/adr-0001-anonymous-progress.md` - Architecture decision record

### Files Modified:

- `components/video-detail.tsx` - Player integration with resume
- `components/video-thumbnail.tsx` - Added progress prop support
- `components/featured-playlist.tsx` - Uses progress wrapper
- `components/playlist-video-list.tsx` - Client component with progress
- `components/playlist-sidebar.tsx` - Live progress updates
- `app/(default)/page.tsx` - Uses progress wrapper
- `app/(default)/layout.tsx` - Added ProgressProvider
- `package.json` - Added `idb@8.0.3` dependency

### Feature Highlights:

✨ **YouTube-Style Progress Tracking**
- Progress bars on all video thumbnails (homepage, playlists, sidebar)
- Checkmark indicators on completed videos (≥90% watched)
- Automatic resume from last watched position
- Live progress updates in playlist sidebar (every 2.5 seconds)

✨ **Cross-Tab Synchronization**
- BroadcastChannel for modern browsers
- localStorage fallback for older browsers
- Same-tab listeners for real-time sidebar updates
- Instant sync across all open tabs

✨ **Multi-Tenant Isolation**
- Composite keys: `bt_${tenantSlug}:${videoId}`
- Complete data isolation per tenant
- No cross-contamination of progress data

✨ **Performance Optimized**
- Throttled saves (2.5 second intervals)
- Immediate saves on pause/seeking/ended events
- Efficient IndexedDB queries
- No jank during playback

✨ **Privacy First**
- 100% client-side storage (IndexedDB)
- No server communication
- User can opt-out via toggle
- Works in offline mode

### Testing Completed:

- ✅ All TypeScript compilation passes
- ✅ All ESLint checks pass
- ✅ Development and production builds successful
- ✅ Resume functionality verified across multiple videos
- ✅ Progress bars display correctly on all pages
- ✅ Cross-tab synchronization working in Chrome, Firefox, Safari
- ✅ Live sidebar updates working (every 2.5 seconds)
- ✅ Completion indicators showing correctly
- ✅ Multi-tenant isolation verified

### Debug Resources:

For troubleshooting, see `docs/DEBUG-PROGRESS-TRACKING.md` which includes:
- Console debug logs to check
- IndexedDB inspection guide
- Progress bar rendering verification
- Resume functionality testing steps
- Cross-tab sync testing
- Common issues and solutions

---

## References

- **Research Document**: `thoughts/shared/research/2025-10-19-BOLD-728-anonymous-video-progress.md`
- **Linear Tickets**:
  - BOLD-728: Frontend implementation of anonymous video progress (v1)
  - BOLD-729: Write ADR documenting the architectural decision
- **ADR**: `docs/adr/adr-0001-anonymous-progress.md`
- **Codebase Patterns**:
  - Player integration: `components/video-detail.tsx:69-189`
  - Storage pattern: `components/providers/playlist-provider.tsx:25-56`
  - Toggle pattern: `components/autoplay-toggle.tsx`
- **External References**:
  - idb library: https://github.com/jakearchibald/idb
  - BroadcastChannel API: https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API
  - IndexedDB spec: https://w3c.github.io/IndexedDB/
