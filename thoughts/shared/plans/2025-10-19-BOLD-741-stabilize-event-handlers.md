---
date: 2025-10-19
author: Claude
ticket: BOLD-741
topic: "Stabilize player event handlers to avoid listener churn"
status: complete
---

# Stabilize Player Event Handlers Implementation Plan

## Overview

Fix unnecessary event listener churn in the `useVideoProgress` hook by extending the existing refs pattern to the `saveCurrentProgress` callback itself. This prevents the event listener effect from re-running whenever the callback is recreated due to `videoId` or `duration` changes.

## Current State Analysis

### The Problem

The event listener effect at `hooks/use-video-progress.ts:227-274` includes `saveCurrentProgress` in its dependency array, causing it to re-run whenever the callback is recreated:

```typescript
useEffect(() => {
  // ... event listeners setup
}, [playerRef, canUseStorage, saveCurrentProgress, duration]);
```

The `saveCurrentProgress` callback is defined with `useCallback` and depends on `[videoId, duration]`:

```typescript
const saveCurrentProgress = useCallback(
  async (position: number) => {
    // ... implementation
  },
  [videoId, duration]
);
```

When `videoId` or `duration` changes:
1. `saveCurrentProgress` is recreated
2. Event listener effect re-runs
3. All four event listeners are removed
4. All four event listeners are re-added

This creates:
- Unnecessary listener churn (removing and re-adding 4 listeners)
- Potential race conditions where events fire between removal and re-add
- GC pressure from function recreation

### Existing Refs Pattern

The hook already uses refs to avoid stale closures at `hooks/use-video-progress.ts:51-72`:

```typescript
// Refs for mutable values to avoid stale closures
const progressRef = useRef<ProgressRecord | null>(null);
const tenantIdRef = useRef<string | null>(null);
const canUseStorageRef = useRef<boolean>(false);

// Sync refs with current values
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

The `saveCurrentProgress` callback reads from these refs to get the latest values without depending on them.

## Desired End State

After implementation:
- Event listener effect only re-runs when truly necessary (player, storage, or duration changes)
- Event handlers access the latest `saveCurrentProgress` logic via a ref
- No listener churn when `videoId` changes (since `duration` changing is expected to trigger re-setup)
- All existing functionality preserved

### Verification

**Automated:**
- [x] TypeScript compilation passes: `npm run build`
- [x] Linting passes: `npm run lint`
- [ ] No console errors during video playback

**Manual:**
- [ ] Video progress saves correctly during playback
- [ ] Progress saves immediately on pause, seeking, and video end
- [ ] Throttling still works (saves limited to every 2.5 seconds during continuous playback)
- [ ] Cross-tab sync continues to work
- [ ] Resume position loads correctly
- [ ] No listener churn observed in React DevTools Profiler when switching between videos

## What We're NOT Doing

- Not changing the throttling logic
- Not modifying the progress calculation algorithm
- Not changing the event types being listened to
- Not refactoring to `useSyncExternalStore` (alternative pattern exists in `util/use-current-player-time.ts` but not needed for this fix)
- Not removing `duration` from the event listener effect deps (it's needed for the `handleEnded` callback)

## Implementation Approach

Extend the existing refs pattern to include the `saveCurrentProgress` callback itself:

1. Create a ref to hold the latest `saveCurrentProgress` callback
2. Update the ref on every render (before effects run) to ensure handlers always have the latest logic
3. Event handlers call `saveProgressRef.current` instead of `saveCurrentProgress` directly
4. Remove `saveCurrentProgress` from the event listener effect's dependency array

This makes the event handlers stable while ensuring they always access the latest callback logic, even if event listeners were attached before a state update.

## Phase 1: Add Callback Ref and Synchronization

### Overview

Add a new ref to store the `saveCurrentProgress` callback and keep it synchronized on every render. This ensures event handlers always call the latest logic, even if they were attached before a state update.

### Changes Required

#### 1. Add Callback Ref Declaration and Synchronization

**File**: `hooks/use-video-progress.ts`
**Location**: After the `saveCurrentProgress` callback definition (after line 207)
**Changes**: Add ref declaration and immediate synchronization

```typescript
const saveCurrentProgress = useCallback(
  async (position: number) => {
    // ... existing implementation
  },
  [videoId, duration]
);

// Keep ref synchronized with latest callback on every render
const saveProgressRef = useRef(saveCurrentProgress);
saveProgressRef.current = saveCurrentProgress;
```

**Reasoning**: By updating `saveProgressRef.current` immediately after initialization, the ref always points to the latest callback before any effects run. This is more robust than using a separate `useEffect` which would run after rendering is complete.

### Success Criteria

#### Automated Verification:
- [x] TypeScript compilation passes: `npm run build`
- [x] No type errors for the new ref
- [x] Linting passes: `npm run lint`
- [x] No ESLint warnings about unused variables

#### Manual Verification:
- [ ] Code compiles and runs without errors
- [ ] No change in behavior yet (callback still working the same way)
- [ ] Ref is properly typed and initialized

## Phase 2: Update Event Handlers

### Overview

Modify the four event handlers to call `saveProgressRef.current` instead of `saveCurrentProgress` directly, and remove `saveCurrentProgress` from the effect's dependency array.

### Changes Required

#### 1. Update Event Handler Implementations

**File**: `hooks/use-video-progress.ts`
**Location**: Lines 231-254 (event handler definitions)
**Changes**: Replace `saveCurrentProgress` calls with `saveProgressRef.current` calls

```typescript
const handleTimeUpdate = () => {
  const position = player.currentTime;
  saveProgressRef.current(position);
};

const handlePause = () => {
  const position = player.currentTime;
  // Force immediate save on pause (bypass throttle)
  lastSaveTimeRef.current = 0;
  saveProgressRef.current(position);
};

const handleSeeking = () => {
  const position = player.currentTime;
  // Force immediate save on seek (bypass throttle)
  lastSaveTimeRef.current = 0;
  saveProgressRef.current(position);
};

const handleEnded = () => {
  // Mark as complete (100% position)
  lastSaveTimeRef.current = 0;
  saveProgressRef.current(duration);
};
```

#### 2. Update Effect Dependency Array

**File**: `hooks/use-video-progress.ts`
**Location**: Line 274 (dependency array)
**Changes**: Remove `saveCurrentProgress` from dependencies

```typescript
}, [playerRef, canUseStorage, duration]);
```

**Reasoning**: The `duration` dependency remains because it's directly used in the `handleEnded` callback. The `saveCurrentProgress` dependency is removed because handlers now access it via the ref.

### Success Criteria

#### Automated Verification:
- [x] TypeScript compilation passes: `npm run build`
- [x] No type errors in event handlers
- [x] Linting passes: `npm run lint`
- [x] No eslint warnings about exhaustive-deps

#### Manual Verification:
- [ ] Video progress tracking works during playback
- [ ] Progress saves on timeupdate events (check browser DevTools IndexedDB)
- [ ] Immediate save on pause (no throttle delay)
- [ ] Immediate save on seeking (no throttle delay)
- [ ] Video marked complete when ended
- [ ] Event listeners not removed/re-added when switching videos (verify in React DevTools Profiler)

## Phase 3: Testing & Verification

### Overview

Comprehensive testing to ensure the fix works correctly and doesn't introduce regressions.

### Testing Strategy

#### Unit-Level Verification:
1. Verify event listeners are stable
   - Open React DevTools Profiler
   - Play a video, then switch to another video
   - Confirm the event listener effect doesn't re-run when only `videoId` changes
   - Confirm the effect DOES re-run when `duration` changes (new video loaded)

2. Verify throttling behavior
   - Play video continuously
   - Check IndexedDB updates in DevTools
   - Confirm saves are throttled to ~2.5 second intervals

3. Verify immediate save bypass
   - Play video, then pause
   - Check IndexedDB immediately
   - Confirm progress saved without throttle delay
   - Repeat for seeking and video end

#### Integration Testing:
1. Full playback flow
   - Start new video from beginning
   - Play for 10 seconds
   - Pause (verify immediate save)
   - Seek forward (verify immediate save)
   - Play to end (verify completion)
   - Reload page (verify resume position)

2. Cross-tab synchronization
   - Open video in two tabs
   - Play in tab 1, verify progress updates in tab 2
   - Pause in tab 1, verify immediate sync to tab 2

3. Multiple video switches
   - Quickly switch between 3-4 different videos
   - Verify each video's progress is tracked correctly
   - Check for any console errors or warnings

#### Edge Cases:
1. Very short videos (< 5 seconds)
2. Seeking multiple times rapidly
3. Network interruption during save
4. Browser storage disabled/full

### Success Criteria

#### Automated Verification:
- [ ] All TypeScript compilation passes: `npm run build`
- [ ] No console errors during testing scenarios
- [ ] No React warnings in DevTools console

#### Manual Verification:
- [ ] All unit-level verification tests pass
- [ ] All integration tests pass
- [ ] No regressions in video player functionality
- [ ] Progress tracking feels responsive
- [ ] No performance degradation observed
- [ ] Event listener churn eliminated (verified via React DevTools Profiler)

## Testing Strategy

### Manual Testing Steps

1. **Baseline Test - Normal Playback**
   - Open video detail page
   - Play video for 30 seconds
   - Check IndexedDB (Application tab in DevTools)
   - Verify progress record exists with correct position

2. **Throttling Test**
   - Continue playing video
   - Observe IndexedDB updates occur every ~2.5 seconds
   - Verify not saving on every timeupdate event

3. **Immediate Save Test - Pause**
   - Note current progress timestamp in IndexedDB
   - Pause video
   - Immediately check IndexedDB
   - Verify progress updated without throttle delay

4. **Immediate Save Test - Seeking**
   - Play video
   - Seek to different position
   - Immediately check IndexedDB
   - Verify new position saved

5. **Completion Test**
   - Play video to the end
   - Check IndexedDB
   - Verify `completed: true` and `percentWatched >= 90`

6. **Listener Churn Test**
   - Open React DevTools Profiler
   - Start recording
   - Switch from one video to another
   - Stop recording
   - Examine the `useVideoProgress` effect commits
   - Verify event listener effect doesn't re-run unnecessarily

7. **Cross-Tab Sync Test**
   - Open same video in two browser tabs
   - Play in tab 1 for 10 seconds
   - Check tab 2 for updated progress
   - Verify BroadcastChannel sync working

8. **Resume Test**
   - Play video to 50% position
   - Refresh page
   - Verify video offers to resume from 50%
   - Click resume, verify playback continues from correct position

## Performance Considerations

### Before Fix:
- Event listeners removed/re-added whenever `videoId` changes
- Event listeners removed/re-added whenever `duration` changes
- Creates 4 new function objects each time
- GC pressure from frequent function recreation

### After Fix:
- Event listeners only removed/re-added when:
  - `playerRef` changes (new player instance)
  - `canUseStorage` changes (storage availability)
  - `duration` changes (new video loaded)
- No churn when only `videoId` changes
- Stable function references reduce GC pressure
- No race conditions between event firing and listener re-attachment

### Metrics to Monitor:
- React DevTools Profiler commit count for event listener effect
- Browser performance timeline during video switching
- Memory usage during extended playback sessions

## Migration Notes

No migration required. This is a refactoring that maintains the same external behavior and API.

## References

- Research document: `thoughts/shared/research/2025-10-19-BOLD-741-player-event-handler-listener-churn.md`
- Related fix (stale closures): `thoughts/shared/research/2025-10-19-BOLD-740-stale-closures-throttled-progress.md`
- Hook implementation: `hooks/use-video-progress.ts:227-274`
- Callback definition: `hooks/use-video-progress.ts:150-207`
- Similar pattern (alternative): `util/use-current-player-time.ts` (useSyncExternalStore approach)
- Config constants: `lib/progress/types.ts:40-47`
