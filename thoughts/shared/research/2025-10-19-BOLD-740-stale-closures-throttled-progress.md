---
date: 2025-10-19T11:32:03+0000
researcher: marcelfahle
git_commit: c352e07f14ed1f150f46c91095b3498d11920d42
branch: feat/progress-furthest-position-continue-watching
repository: bold-nextjs-tailwind-starter
topic: "Stale Closures in Throttled Video Progress Tracking (BOLD-740)"
tags: [research, codebase, react-hooks, closures, throttling, use-callback, refs, progress-tracking]
status: complete
last_updated: 2025-10-19
last_updated_by: marcelfahle
---

# Research: Stale Closures in Throttled Video Progress Tracking (BOLD-740)

**Date**: 2025-10-19T11:32:03+0000
**Researcher**: marcelfahle
**Git Commit**: c352e07f14ed1f150f46c91095b3498d11920d42
**Branch**: feat/progress-furthest-position-continue-watching
**Repository**: bold-nextjs-tailwind-starter

## Research Question

What is the stale closure bug in the `useVideoProgress` hook's throttled `saveCurrentProgress` function (BOLD-740), how does it manifest, and what existing patterns in the codebase can inform a fix?

## Summary

The `useVideoProgress` hook at `hooks/use-video-progress.ts:119-171` contains a stale closure bug in its throttling logic. When `saveCurrentProgress` schedules a delayed save via `setTimeout`, the callback captures the current function instance with its closure over `progress`, `tenantId`, `canUseStorage`, etc. If these values change before the timeout fires (e.g., user switches tenant or progress state updates), the delayed execution uses stale values.

**Critical Impact**:
- Writes to wrong tenant's IndexedDB store after tenant switch
- Calculates `furthestPosition` from outdated `progress` state
- May no-op silently when `canUseStorage` has become false

**Solution Pattern**: The codebase contains several examples of using refs with `useCallback` to avoid stale closures. The fix should move mutable data (`progress`, `tenantId`, `canUseStorage`) into refs while keeping `saveCurrentProgress` callback stable or minimally dependent.

## Detailed Findings

### 1. Stale Closure Mechanism in useVideoProgress

**Location**: `hooks/use-video-progress.ts:119-171`

#### How the Throttling Works

The `saveCurrentProgress` callback implements a throttling mechanism with recursive `setTimeout` scheduling:

**Line 119-171**: useCallback definition
```typescript
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
        saveCurrentProgress(position);  // ⚠️ STALE CLOSURE
      }, PROGRESS_CONFIG.THROTTLE_INTERVAL - timeSinceLastSave);

      return;
    }

    // Save immediately
    lastSaveTimeRef.current = now;

    try {
      await saveProgress(tenantId, videoId, position, duration);

      // Update local state with furthest position tracking
      const furthestPosition = Math.max(
        position,
        progress?.furthestPosition || 0  // ⚠️ Uses closure progress
      );
      const percentWatched = Math.min((furthestPosition / duration) * 100, 100);
      const completed = percentWatched >= PROGRESS_CONFIG.COMPLETION_THRESHOLD;

      setProgress({
        id: `${tenantId}:${videoId}`,
        videoId,
        tenantId,
        position,
        furthestPosition,
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
  [canUseStorage, tenantId, videoId, duration, progress]
);
```

#### The Closure Capture Problem

**Line 133-135**: setTimeout creates closure
```typescript
saveTimeoutRef.current = setTimeout(() => {
  saveCurrentProgress(position);
}, PROGRESS_CONFIG.THROTTLE_INTERVAL - timeSinceLastSave);
```

This closure captures the **current instance** of `saveCurrentProgress` which has closed over:
- `canUseStorage` (line 121) - derived from `enabled && isIndexedDBAvailable() && tenantId !== null`
- `tenantId` (line 121, 144) - computed at line 51 via `getTenantId(settings)`
- `progress` (line 149) - state from line 42
- `videoId`, `duration` - props

**Line 170**: Dependency array
```typescript
[canUseStorage, tenantId, videoId, duration, progress]
```

When any dependency changes, React creates a **new** `saveCurrentProgress` function instance. However, pending `setTimeout` callbacks still reference the **old** instance with stale values.

#### Execution Flow Demonstrating Staleness

**Scenario**: User switches tenant during throttle delay

**T=0ms**: User watches video, `saveCurrentProgress(50)` called
- `tenantId = "bt_ranger"`
- `progress.furthestPosition = 40`
- `timeSinceLastSave = 0`
- Line 127: `0 < 2500` → true
- Line 133-135: Schedule timeout for 2500ms with **current** `saveCurrentProgress` instance

**T=1000ms**: User changes settings, tenant switches
- `settings.account.slug` changes from "ranger" to "admin"
- Line 51: `tenantId` recomputes to `"bt_admin"`
- Line 54: `canUseStorage` may change
- Line 119-170: **New** `saveCurrentProgress` created with new `tenantId`, `canUseStorage`, `progress`
- **Pending timeout still holds OLD function instance**

**T=2500ms**: Timeout fires
- Line 134: Executes `saveCurrentProgress(50)` from **OLD** instance
- Line 121: Checks OLD `canUseStorage` (possibly true for "bt_ranger")
- Line 144: Calls `saveProgress(OLD_tenantId, videoId, position, duration)` where `OLD_tenantId = "bt_ranger"`
- Line 149: Uses OLD `progress.furthestPosition = 40`
- **Result**: Writes to wrong tenant's store ("bt_ranger" instead of "bt_admin")

#### Stale Values Used

**Line 121**: Early return guard
```typescript
if (!canUseStorage || !tenantId) return;
```
- `canUseStorage` may be stale (e.g., was true for old tenant, false for new)
- `tenantId` may be stale (old tenant ID)

**Line 144**: Database write
```typescript
await saveProgress(tenantId, videoId, position, duration);
```
- `tenantId` - **CRITICAL**: writes to wrong tenant's store
- `videoId`, `duration` - may be stale if video changed

**Line 147-150**: furthestPosition calculation
```typescript
const furthestPosition = Math.max(
  position,
  progress?.furthestPosition || 0
);
```
- `progress?.furthestPosition` - stale value from previous video or state

#### Configuration

**Throttle interval**: 2500ms (2.5 seconds)
**Source**: `lib/progress/types.ts:45`
```typescript
export const PROGRESS_CONFIG = {
  THROTTLE_INTERVAL: 2500,  // Milliseconds (2.5 seconds)
  // ...
} as const;
```

### 2. Existing Patterns for Refs and useCallback

The codebase contains several patterns that demonstrate how to avoid stale closures using refs.

#### Pattern A: Minimal Dependencies with Refs

**Location**: `components/video-detail.tsx:144-150`

```typescript
const playerRef = useRef<HTMLVideoElement | null>(null);

const handleTimeSelect = useCallback((time: number) => {
  const toTime = isNaN(time) ? 0.1 : parseFloat(time.toString());
  if (playerRef?.current) {
    playerRef.current.currentTime = toTime;
    playerRef.current.play();
  }
}, []);  // Empty deps - stable callback
```

**Key aspects**:
- Empty dependency array `[]` creates stable callback
- Accesses `playerRef.current` directly without stale closure issues
- Ref access inside callback always gets latest value

#### Pattern B: Bypassing Throttle with Ref Reset

**Location**: `hooks/use-video-progress.ts:200-218`

```typescript
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
```

**Key aspects**:
- Resetting `lastSaveTimeRef.current = 0` bypasses throttle check
- Forces immediate execution on critical events
- No dependencies needed - direct ref mutation

#### Pattern C: useSyncExternalStore with Stable Subscription

**Location**: `util/use-current-player-time.ts:4-20`

```typescript
export const useCurrentPlayerTime = (ref: React.RefObject<any>) => {
  const subscribe = useCallback(
    (onStoreChange: (newVal: number) => void) => {
      const { current } = ref;
      if (!current) {
        return () => undefined;
      }

      const updater = (e: any) => {
        onStoreChange(e.currentTime);
      };
      current.addEventListener("timeupdate", updater);
      return () => {
        current.removeEventListener("timeupdate", updater);
      };
    },
    [ref]
  );

  const data = useSyncExternalStore<number>(
    subscribe,
    () => ref.current?.currentTime ?? 0,
    () => 0
  );

  return data;
};
```

**Key aspects**:
- `useCallback` with `[ref]` dependency creates stable subscription
- Reads from `ref.current` inside callback to access latest element
- Returns cleanup function from subscription

#### Pattern D: Ref for Tracking State Without Re-renders

**Location**: `components/players/player-mux.tsx:110-244`

```typescript
const chaptersLoadedRef = useRef(false);

// Apply chapters to player whenever chapters or player ref changes
useEffect(() => {
  if (!chapters || !playerRef.current || chaptersLoadedRef.current) return;

  const addChaptersToPlayer = () => {
    const player = playerRef.current;
    if (player && typeof player.addChapters === "function" && chapters) {
      player.addChapters(chapters);
      chaptersLoadedRef.current = true;
    }
  };

  const player = playerRef.current;
  if (player && player.readyState >= 1) {
    addChaptersToPlayer();
  } else if (player) {
    const handleReady = () => {
      addChaptersToPlayer();
    };

    player.addEventListener("loadedmetadata", handleReady, { once: true });
    player.addEventListener("canplay", handleReady, { once: true });

    // Safety timeout
    setTimeout(handleReady, 2000);
  }
}, [chapters]);

// Reset chapters loaded flag when video changes
useEffect(() => {
  chaptersLoadedRef.current = false;
}, [video.id]);
```

**Key aspects**:
- `chaptersLoadedRef` prevents duplicate chapter loading
- Ref mutation doesn't trigger re-renders
- Reset in separate useEffect when video changes

### 3. Related Progress Tracking Components

#### Core Progress Library
- `lib/progress/store.ts` - IndexedDB wrapper with `saveProgress()`, `getProgress()`
- `lib/progress/sync.ts` - Cross-tab synchronization via BroadcastChannel
- `lib/progress/types.ts` - Type definitions and `PROGRESS_CONFIG`
- `lib/progress/tenant.ts` - Tenant ID extraction from settings

#### Progress Hook
- `hooks/use-video-progress.ts` - **Main file with bug** - throttled progress tracking

#### Components Using Progress
- `components/providers/progress-provider.tsx` - Context provider for progress state
- `components/video-detail.tsx` - Video player integration (uses `useVideoProgress`)
- `components/video-thumbnail-with-progress.tsx` - Thumbnail with progress bar
- `components/progress-bar.tsx` - Progress bar UI component
- `components/playlist-sidebar.tsx` - Playlist with progress indicators

#### Progress Synchronization
- `lib/progress/sync.ts:13-66` - `initProgressSync()` for cross-tab updates
- `lib/progress/store.ts:73-75` - `broadcastProgressUpdate()` called after save

### 4. Historical Context

#### Recent Implementation (2025-10-19)

The video progress tracking feature was recently implemented as part of BOLD-728 (anonymous progress tracking). Two thought documents provide context:

**Research Document**: `thoughts/shared/research/2025-10-19-BOLD-728-anonymous-video-progress.md`
- Investigated YouTube-style progress tracking requirements
- Documented existing Mux Player integration patterns
- Researched throttling patterns in the codebase

**Implementation Plan**: `thoughts/shared/plans/2025-10-19-BOLD-728-anonymous-video-progress.md`
- Documented 6-phase implementation approach
- Phase 3 created the `useVideoProgress` hook with throttled saves
- Phase 6 implemented cross-tab synchronization

**Key Quote from Plan** (lines 737-783):
```typescript
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
        saveCurrentProgress(position);  // This is where staleness occurs
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
```

**Note**: The implementation plan shows dependencies as `[canUseStorage, tenantId, videoId, duration]` (line 783 in plan), but the actual implementation added `progress` to the dependency array to enable `furthestPosition` tracking. This addition made the stale closure issue more severe.

#### Design Considerations from ADR

**Document**: `docs/adr/adr-0001-anonymous-progress.md`

The ADR documented the throttling decision:
- **Throttle interval**: 2.5 seconds (line 404)
- **Immediate saves**: On pause, seeking, ended events (lines 816-831)
- **Rationale**: Balance between IndexedDB write performance and data loss risk

The ADR did not anticipate the stale closure issue with tenant switching, as multi-tenant tenant switching was not a primary use case during initial implementation.

## Code References

### Bug Location
- `hooks/use-video-progress.ts:119-171` - Main `saveCurrentProgress` callback
- `hooks/use-video-progress.ts:133-135` - setTimeout closure creating stale reference
- `hooks/use-video-progress.ts:170` - Dependency array causing callback recreation
- `hooks/use-video-progress.ts:147-150` - furthestPosition calculation using stale `progress`

### Related Implementation
- `hooks/use-video-progress.ts:42` - `progress` state declaration
- `hooks/use-video-progress.ts:51` - `tenantId` computed from settings
- `hooks/use-video-progress.ts:54` - `canUseStorage` derived value
- `hooks/use-video-progress.ts:47-48` - Throttling refs (`lastSaveTimeRef`, `saveTimeoutRef`)
- `lib/progress/types.ts:45` - `THROTTLE_INTERVAL` constant (2500ms)

### Relevant Patterns
- `components/video-detail.tsx:144-150` - Empty dependency useCallback with ref access
- `util/use-current-player-time.ts:4-20` - useSyncExternalStore with stable subscription
- `components/players/player-mux.tsx:110-244` - Ref for state tracking without re-renders

## Architecture Documentation

### Current Throttling Implementation

**Approach**: Recursive setTimeout with callback dependency on mutable state

**Flow**:
1. Player fires `timeupdate` event every ~250ms
2. `saveCurrentProgress(position)` called
3. If `timeSinceLastSave < 2500ms`, schedule delayed save via `setTimeout`
4. Clear previous timeout to debounce rapid calls
5. When timeout fires, recursively call `saveCurrentProgress(position)` with old closure
6. If `timeSinceLastSave >= 2500ms`, save immediately

**Refs Used**:
- `lastSaveTimeRef` - Timestamp of last successful save (shared across all callback instances)
- `saveTimeoutRef` - Pending timeout ID for cleanup (shared across all callback instances)

**State/Derived Values**:
- `progress` - React state, changes on each save
- `tenantId` - Derived from `settings.account.slug`, changes on settings update
- `canUseStorage` - Derived from `enabled && isIndexedDBAvailable() && tenantId !== null`
- `videoId`, `duration` - Props, change on video navigation

### Dependency Array Analysis

**Current Dependencies** (`hooks/use-video-progress.ts:170`):
```typescript
[canUseStorage, tenantId, videoId, duration, progress]
```

**Recreates callback when**:
- Settings change (affects `tenantId`, `canUseStorage`)
- Video navigation (affects `videoId`, `duration`)
- Progress state updates (affects `progress`)

**Issue**: Progress state updates **frequently** (every save triggers `setProgress`), causing frequent callback recreation. Pending timeouts continue referencing old callback instances.

### Cross-Tab Synchronization Impact

The sync mechanism broadcasts updates after each save:

**`lib/progress/sync.ts:84-93`** - Broadcast after save
```typescript
await db.put(PROGRESS_CONFIG.STORE_NAME, record);

// Broadcast update to other tabs
broadcastProgressUpdate(videoId, tenantId);
```

If a timeout fires with a stale `tenantId`, it broadcasts the wrong tenant ID to other tabs, potentially triggering incorrect refresh behavior.

## Historical Context (from thoughts/)

### Implementation Timeline

**2025-10-19**: Initial implementation of anonymous progress tracking
- Created IndexedDB wrapper (`lib/progress/store.ts`)
- Implemented `useVideoProgress` hook with throttling
- Added cross-tab synchronization via BroadcastChannel
- Integrated into video player and thumbnails

**Current Branch**: `feat/progress-furthest-position-continue-watching`
- Extended progress tracking to track `furthestPosition`
- Added `progress` to `saveCurrentProgress` dependencies to calculate furthest position
- This change exacerbated the stale closure issue

### Related Research

From `thoughts/shared/research/2025-10-19-BOLD-728-anonymous-video-progress.md`:

**Throttling Pattern Analysis** (lines 119-138 in research):
> "The throttling logic operates as follows: Calculate time elapsed since last save using `lastSaveTimeRef.current`. If elapsed time is less than `PROGRESS_CONFIG.THROTTLE_INTERVAL`, schedule a delayed save via `setTimeout`..."

The research document noted the throttling pattern but did not identify the stale closure risk when dependencies change during the throttle delay.

**useCallback Pattern Examples** (lines 616-631 in research):
> "**Explicit typing** for function params and return types... **Use SDK types** from `@boldvideo/bold-js` when available..."

The research documented TypeScript patterns but did not specifically address closure capture in async callbacks.

## Related Research

No previous research documents on stale closures, useCallback dependencies, or throttling patterns were found in `thoughts/shared/research/`.

This appears to be the first documented instance of this specific bug pattern in the codebase.

## Open Questions

### Implementation Questions

1. **Ref Strategy**: Should we move `progress`, `tenantId`, and `canUseStorage` into refs?
   - **Option A**: Move all mutable values to refs, minimize dependencies
   - **Option B**: Keep only `progress` in ref for `furthestPosition` calculation
   - **Option C**: Restructure to avoid recursive setTimeout pattern entirely

2. **Dependency Array**: What should the minimal dependency array be?
   - **Current**: `[canUseStorage, tenantId, videoId, duration, progress]`
   - **Proposed**: `[videoId, duration]` with other values in refs

3. **Throttle Pattern**: Should we change the throttling approach?
   - **Current**: Recursive setTimeout
   - **Alternative**: setInterval with ref-based checks
   - **Alternative**: External throttle utility (e.g., lodash.throttle)

### Edge Cases

1. **Rapid Tenant Switching**: If user switches tenant multiple times during throttle delay, which tenant should receive the final save?
   - Should we cancel pending saves on tenant change?
   - Should we track "tenant at time of call" vs "tenant at time of save"?

2. **Video Navigation During Throttle**: If user navigates to new video while throttle pending, should we:
   - Cancel pending save?
   - Save to previous video?
   - Save to new video with old position?

3. **Settings Null State**: What happens if `settings` becomes null during throttle delay?
   - Current code: `getTenantId()` returns null, early return prevents save
   - With refs: Would need to check ref value at save time

### Testing Considerations

1. **How to test stale closure bug?**
   - Mock setTimeout with jest.useFakeTimers()
   - Trigger dependency change mid-throttle
   - Verify correct tenant ID used in save

2. **How to test furthestPosition with refs?**
   - Ensure ref updates don't cause unnecessary re-renders
   - Verify furthestPosition calculation uses latest value

3. **Regression testing**:
   - Ensure fix doesn't break existing cross-tab sync
   - Verify immediate saves (pause/seeking/ended) still work
   - Confirm throttling still functions correctly
