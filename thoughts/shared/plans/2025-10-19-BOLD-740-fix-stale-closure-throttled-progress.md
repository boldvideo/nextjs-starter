---
date: 2025-10-19T12:00:00+0000
author: marcelfahle
git_commit: c352e07f14ed1f150f46c91095b3498d11920d42
branch: feat/progress-furthest-position-continue-watching
repository: bold-nextjs-tailwind-starter
topic: "Fix Stale Closures in Throttled Video Progress Tracking (BOLD-740)"
tags: [plan, implementation, react-hooks, closures, throttling, refs, progress-tracking]
status: ready
---

# Fix Stale Closures in Throttled Video Progress Tracking

## Overview

Fix the stale closure bug in `useVideoProgress` hook where throttled saves use outdated values for `tenantId`, `progress`, and `canUseStorage`, causing writes to the wrong tenant's IndexedDB and incorrect `furthestPosition` calculations.

## Current State Analysis

The `saveCurrentProgress` callback in `hooks/use-video-progress.ts:119-171` implements throttling via recursive `setTimeout`. When the callback schedules a delayed save, it captures the current function instance with closures over mutable values:

**Problem**: Line 133-135
```typescript
saveTimeoutRef.current = setTimeout(() => {
  saveCurrentProgress(position);  // ⚠️ Captures current callback instance
}, PROGRESS_CONFIG.THROTTLE_INTERVAL - timeSinceLastSave);
```

**Dependency Array**: Line 170
```typescript
[canUseStorage, tenantId, videoId, duration, progress]
```

When any dependency changes, React creates a **new** callback, but pending `setTimeout` callbacks still reference the **old** instance with stale values.

**Critical Scenarios:**
1. **Tenant Switch**: User switches from "bt_ranger" to "bt_admin" during throttle delay → delayed save writes to "bt_ranger" store
2. **Progress State Update**: `setProgress()` triggers callback recreation → delayed save uses old `progress.furthestPosition`
3. **Storage Availability Change**: Settings change makes `canUseStorage` false → delayed save may still execute with stale true value

### Key Discoveries:

- **Research Document**: `thoughts/shared/research/2025-10-19-BOLD-740-stale-closures-throttled-progress.md` comprehensively documents the bug, execution flow, and stale value impact
- **Throttle Interval**: 2500ms (2.5 seconds) from `lib/progress/types.ts:45`
- **Existing Pattern**: `components/video-detail.tsx:144-150` uses empty dependency array `[]` with ref access for stable callbacks
- **Bypass Pattern**: `hooks/use-video-progress.ts:200-218` resets `lastSaveTimeRef.current = 0` to force immediate saves
- **Cross-Tab Sync**: `lib/progress/sync.ts:70-101` broadcasts `tenantId` after save — stale tenant ID broadcasts incorrect updates

## Desired End State

After this implementation:

1. `saveCurrentProgress` always uses the **latest** values for `tenantId`, `canUseStorage`, and `progress`, even in delayed timeout callbacks
2. Pending timeouts are **cleared** when `videoId` or `duration` change (different video)
3. Pending timeouts are **cleared** when the component unmounts
4. The callback only recreates when `videoId` or `duration` change (not on every `progress` update)
5. No regression in existing functionality: throttling, immediate saves, cross-tab sync

### Verification:

**Automated:**
- Type checking passes: `npm run typecheck`
- Linting passes: `npm run lint`
- Build succeeds: `npm run build`

**Manual:**
1. Start video playback in "bt_ranger" tenant
2. During throttle delay (within 2.5s), switch to "bt_admin" tenant
3. Verify save writes to "bt_admin" store (not "bt_ranger")
4. Verify `furthestPosition` uses latest state value
5. Verify no console warnings about failed saves

## What We're NOT Doing

1. **Not changing the throttling mechanism** — still using recursive `setTimeout` with `lastSaveTimeRef`
2. **Not changing the throttle interval** — still 2500ms
3. **Not changing immediate save triggers** — pause, seeking, ended events still bypass throttle
4. **Not adding external throttling libraries** — no lodash.throttle or similar
5. **Not changing cross-tab sync mechanism** — still using BroadcastChannel
6. **Not adding tests** in this phase — testing will be manual for now (test infrastructure can be added separately)

## Implementation Approach

Use refs to store mutable values (`progress`, `tenantId`, `canUseStorage`) while keeping only stable identifiers (`videoId`, `duration`) in the dependency array. This follows the pattern from `components/video-detail.tsx:144-150`.

**Key Strategy:**
- Refs provide stable references that don't trigger callback recreation
- Access `.current` inside the callback to always get latest values
- Cleanup pending timeouts when critical identifiers change or component unmounts
- Minimal dependency array reduces unnecessary callback recreation

## Phase 1: Move Mutable Values to Refs ✅

### Overview

Convert `progress`, `tenantId`, and `canUseStorage` from closure-captured values to refs that are accessed inside the callback, ensuring delayed saves always use current values.

### Changes Required:

#### 1. Add Refs for Mutable Values ✅

**File**: `hooks/use-video-progress.ts`
**Location**: After line 48 (existing refs section)

```typescript
// Throttling state
const lastSaveTimeRef = useRef<number>(0);
const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

// ADD: Refs for mutable values to avoid stale closures
const progressRef = useRef<ProgressRecord | null>(null);
const tenantIdRef = useRef<string | null>(null);
const canUseStorageRef = useRef<boolean>(false);
```

#### 2. Update Refs When Values Change ✅

**File**: `hooks/use-video-progress.ts`
**Location**: After line 54 (after computing derived values)

```typescript
// Get tenant ID
const tenantId = getTenantId(settings);

// Check if we can use IndexedDB
const canUseStorage = enabled && isIndexedDBAvailable() && tenantId !== null;

// ADD: Sync refs with current values
useEffect(() => {
  progressRef.current = progress;
}, [progress]);

useEffect(() => {
  tenantIdRef.current = tenantId;
}, [tenantId]);

useEffect(() => {
  canUseStorageRef.current = canUseStorage;
}, [canUseStorage]);
```

#### 3. Update saveCurrentProgress to Use Refs ✅

**File**: `hooks/use-video-progress.ts`
**Location**: Replace lines 119-171

```typescript
/**
 * Save progress to IndexedDB with throttling
 */
const saveCurrentProgress = useCallback(
  async (position: number) => {
    // Access latest values from refs
    const currentTenantId = tenantIdRef.current;
    const currentCanUseStorage = canUseStorageRef.current;
    const currentProgress = progressRef.current;

    if (!currentCanUseStorage || !currentTenantId) return;

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
      await saveProgress(currentTenantId, videoId, position, duration);

      // Update local state with furthest position tracking
      const furthestPosition = Math.max(
        position,
        currentProgress?.furthestPosition || 0
      );
      const percentWatched = Math.min((furthestPosition / duration) * 100, 100);
      const completed = percentWatched >= PROGRESS_CONFIG.COMPLETION_THRESHOLD;

      setProgress({
        id: `${currentTenantId}:${videoId}`,
        videoId,
        tenantId: currentTenantId,
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
  [videoId, duration] // Only recreate when video/duration changes
);
```

**Key Changes:**
- Line 122-124: Access refs at start of function to get latest values
- Line 126: Use `currentCanUseStorage` and `currentTenantId` instead of closure values
- Line 149: Use `currentProgress` instead of closure value
- Line 161: Use `currentTenantId` for composite key and record
- Line 170: **Reduced dependency array** to `[videoId, duration]` only

---

## Phase 2: Add Cleanup Effect for Pending Timeouts ✅

### Overview

Add a cleanup effect that clears pending timeouts when `videoId` or `duration` change (indicating a different video) or when the component unmounts. This prevents delayed saves for the wrong video.

### Changes Required:

#### 1. Add Cleanup Effect ✅

**File**: `hooks/use-video-progress.ts`
**Location**: After the ref sync effects (after Phase 1 changes), before `saveCurrentProgress` definition

```typescript
/**
 * Clear pending timeout when video changes or component unmounts
 */
useEffect(() => {
  return () => {
    // Clear any pending timeout when effect re-runs or unmounts
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  };
}, [videoId, duration]); // When these change, clear pending saves for old video
```

**Rationale:**
- When `videoId` or `duration` change, user has navigated to a different video
- Any pending saves for the previous video should be cancelled
- Cleanup function also runs on unmount, preventing saves after component removal

---

## Phase 3: Verify No Regressions ✅

### Overview

Ensure the changes don't break existing functionality: immediate saves, cross-tab sync, and the existing cleanup in the event listener effect.

### Verification Required:

#### 1. Immediate Save Pattern Still Works

**File**: `hooks/use-video-progress.ts`
**Location**: Lines 200-218 (unchanged)

Verify that this pattern still works:
```typescript
const handlePause = () => {
  const position = player.currentTime;
  // Force immediate save on pause (bypass throttle)
  lastSaveTimeRef.current = 0;
  saveCurrentProgress(position);
};
```

**Why it still works:**
- `saveCurrentProgress` callback is now stable (only recreates on `videoId`/`duration` change)
- Event handlers reference the same callback instance
- Refs ensure latest values are used even in stable callback

#### 2. Event Listener Cleanup Still Works

**File**: `hooks/use-video-progress.ts`
**Location**: Lines 226-237 (unchanged)

Verify existing cleanup still executes:
```typescript
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
```

**Note:** This cleanup runs when `playerRef`, `canUseStorage`, or `saveCurrentProgress` change (line 238). Since `saveCurrentProgress` now only changes on `videoId`/`duration` change, this effect re-runs less frequently, which is actually better for performance.

#### 3. Cross-Tab Sync Unchanged

**File**: `lib/progress/sync.ts`
**No changes required**

The sync mechanism receives the correct `tenantId` because `saveProgress()` now always uses `currentTenantId` from the ref.

---

## Testing Strategy

### Unit Tests:

**Not included in this phase** — the hook depends on IndexedDB, React context, and DOM events, making unit testing complex. Consider adding tests in a future phase with proper mocking infrastructure.

**If tests are added, they should cover:**
- Stale closure scenario: change tenant during throttle delay, verify correct tenant ID used
- Timeout cleanup: change `videoId`, verify pending timeout is cleared
- Ref updates: verify refs sync with state/computed values
- Immediate save bypass: verify `lastSaveTimeRef.current = 0` pattern still works

### Manual Testing Steps:

#### Test 1: Tenant Switch During Throttle

**Steps:**
1. Open DevTools → Application → IndexedDB → `bold-video-progress`
2. Configure settings with tenant "ranger" (`settings.account.slug = "ranger"`)
3. Start playing a video
4. Within 2.5 seconds of starting playback, change settings to tenant "admin"
5. Wait for throttled save to execute

**Expected:**
- Progress record saved with `tenantId: "bt_admin"` (NOT "bt_ranger")
- No console warnings about failed saves
- IndexedDB contains record with key `"bt_admin:${videoId}"`

**Failure Indicator:**
- Record saved with `tenantId: "bt_ranger"` (stale value)

#### Test 2: FurthestPosition Uses Latest State

**Steps:**
1. Play video to position 50 seconds
2. Wait for save to complete (check IndexedDB, `furthestPosition: 50`)
3. Seek backwards to position 20 seconds
4. Immediately seek forward to position 60 seconds (within throttle delay)
5. Wait for throttled save

**Expected:**
- Final record has `furthestPosition: 60` (max of 50 and 60)
- Uses latest `progress.furthestPosition` from state, not stale value

#### Test 3: Video Navigation Clears Pending Timeout

**Steps:**
1. Start playing video A
2. Within throttle delay, navigate to video B (change URL/route)
3. Verify no save occurs for video A after navigation
4. Verify only video B saves are recorded

**Expected:**
- Pending timeout for video A is cleared
- Only video B progress is saved
- No console errors

#### Test 4: Immediate Save Events Still Work

**Steps:**
1. Play video for 5 seconds (beyond throttle interval)
2. Pause video
3. Immediately check IndexedDB

**Expected:**
- Progress saved instantly (no 2.5s delay)
- `position` reflects pause position
- Pattern `lastSaveTimeRef.current = 0; saveCurrentProgress(position)` still bypasses throttle

#### Test 5: Cross-Tab Sync Uses Correct Tenant

**Steps:**
1. Open same video in two browser tabs (Tab A, Tab B)
2. In Tab A, play video with tenant "ranger"
3. In Tab B (same video), verify progress updates appear
4. In Tab A, switch to tenant "admin" during throttle delay
5. In Tab B, verify next update uses correct tenant

**Expected:**
- Tab B receives broadcast with `tenantId: "bt_admin"`
- No cross-contamination between tenant stores

### Performance Verification:

**Before Fix:**
- `saveCurrentProgress` callback recreates on every `progress` state update (frequent)
- Effect at line 238 re-runs frequently

**After Fix:**
- `saveCurrentProgress` callback only recreates when `videoId` or `duration` change (rare)
- Effect at line 238 re-runs less frequently
- **Expected**: Slight performance improvement, fewer effect re-runs

**How to measure:**
- Add `console.log` in `saveCurrentProgress` creation: `useCallback(() => { console.log('saveCurrentProgress created'); ... }, [videoId, duration])`
- Before fix: logs on every save (frequent)
- After fix: only logs when video changes (rare)

---

## Performance Considerations

**Improvements:**
- Fewer callback recreations (only when `videoId`/`duration` change vs. on every `progress` update)
- Fewer effect re-runs (event listener effect at line 191-238 re-runs less often)
- Ref access is O(1) with no re-render cost

**No Performance Degradation:**
- Refs add minimal memory overhead (3 additional refs)
- `useEffect` for ref sync is lightweight (simple assignment)
- Throttling behavior unchanged (still 2500ms interval)

---

## Migration Notes

**No Data Migration Required:**
- IndexedDB schema unchanged
- ProgressRecord type unchanged
- Existing progress records remain valid

**Deployment:**
- No breaking changes
- Can deploy immediately
- Degrades gracefully if errors occur (existing error handling preserved)

---

## References

- **Research Document**: `thoughts/shared/research/2025-10-19-BOLD-740-stale-closures-throttled-progress.md`
  - Comprehensive analysis of stale closure bug
  - Execution flow demonstrating staleness
  - Existing ref patterns in codebase

- **Bug Location**: `hooks/use-video-progress.ts:119-171`
  - Line 133-135: setTimeout creating stale closure
  - Line 170: Dependency array causing frequent recreation
  - Line 147-150: furthestPosition calculation using stale `progress`

- **Pattern Reference**: `components/video-detail.tsx:144-150`
  - Empty dependency array with ref access for stable callbacks

- **Related Files**:
  - `lib/progress/types.ts:45` — THROTTLE_INTERVAL constant
  - `lib/progress/store.ts:78-122` — saveProgress function
  - `lib/progress/sync.ts:70-101` — broadcastProgressUpdate function
  - `lib/progress/tenant.ts:8-15` — getTenantId function
