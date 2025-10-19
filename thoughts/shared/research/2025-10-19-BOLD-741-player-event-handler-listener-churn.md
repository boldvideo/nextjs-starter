---
date: 2025-10-19T12:15:59+0000
researcher: Marcel Fahle
git_commit: 533d51ff2bd3c47da2c7bbf92d40ec5ef9739b65
branch: feat/progress-furthest-position-continue-watching
repository: bold-nextjs-tailwind-starter
topic: "BOLD-741: Stabilise player event handlers to avoid listener churn"
tags: [research, codebase, video-player, useEffect, event-listeners, performance, BOLD-741]
status: complete
last_updated: 2025-10-19
last_updated_by: Marcel Fahle
---

# Research: BOLD-741 - Stabilise Player Event Handlers to Avoid Listener Churn

**Date**: 2025-10-19T12:15:59+0000
**Researcher**: Marcel Fahle
**Git Commit**: 533d51ff2bd3c47da2c7bbf92d40ec5ef9739b65
**Branch**: feat/progress-furthest-position-continue-watching
**Repository**: bold-nextjs-tailwind-starter
**Linear Ticket**: [BOLD-741](https://linear.app/boldvideo/issue/BOLD-741/stabilise-player-event-handlers-to-avoid-listener-churn)

## Research Question

How does the current video progress tracking implementation attach event listeners to the video player, and what causes listener churn that needs to be stabilized?

## Summary

The `useVideoProgress` hook at `hooks/use-video-progress.ts:227-274` attaches four native video event listeners (`timeupdate`, `pause`, `seeking`, `ended`) to track and save video progress. The `useEffect` that manages these listeners includes `saveCurrentProgress` in its dependency array, causing the effect to re-run whenever this callback is recreated.

The `saveCurrentProgress` callback is defined with `useCallback` and depends on `[videoId, duration]`. When either of these values changes, the callback is recreated, triggering the event listener effect to:
1. Remove all four event listeners
2. Re-add all four event listeners with the new callback

This creates unnecessary listener churn. The hook already uses a refs pattern for other values (`progressRef`, `tenantIdRef`, `canUseStorageRef`) to avoid stale closures in the throttled callback. The proposed fix extends this pattern to `saveCurrentProgress` itself, using a ref to hold the latest callback so event handlers can access it without being recreated.

## Detailed Findings

### Current Event Listener Implementation

The event listener management effect is located at `hooks/use-video-progress.ts:227-274`:

```typescript
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
```

**Key observations:**
- Four event handlers are defined inside the effect body
- Each handler calls `saveCurrentProgress` with the current position
- Three handlers (`handlePause`, `handleSeeking`, `handleEnded`) reset `lastSaveTimeRef.current` to bypass throttling
- The effect depends on `[playerRef, canUseStorage, saveCurrentProgress, duration]`
- The cleanup function removes all four listeners and clears any pending timeout

### The Problem: Dependency Chain

The issue arises from this dependency chain:

1. `saveCurrentProgress` is defined with `useCallback` at lines 150-207
2. It depends on `[videoId, duration]` (line 206)
3. When `videoId` or `duration` changes, `saveCurrentProgress` is recreated
4. This triggers the event listener effect to re-run (line 274 dependency)
5. Old listeners are removed and new ones attached

**From the Linear ticket:**
> `useEffect` that attaches `<video>` listeners lists `saveCurrentProgress` in its deps, making the effect re-run on **every** state update (because the callback is re-created when `progress` changes). This leads to:
>
> • Removing & re-adding four native listeners many times per second
> • Potential race conditions where an event fires after removeEventListener but before re-add
> • Unnecessary GC pressure

### Existing Refs Pattern

The hook already uses a refs pattern to avoid stale closures for other values. Three refs are declared at lines 51-53:

```typescript
const progressRef = useRef<ProgressRecord | null>(null);
const tenantIdRef = useRef<string | null>(null);
const canUseStorageRef = useRef<boolean>(false);
```

These refs are synchronized with their latest values through separate effects:

```typescript
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

The `saveCurrentProgress` callback accesses these refs to get the latest values:

```typescript
const saveCurrentProgress = useCallback(
  async (position: number) => {
    // Access latest values from refs
    const currentTenantId = tenantIdRef.current;
    const currentCanUseStorage = canUseStorageRef.current;
    const currentProgress = progressRef.current;

    if (!currentCanUseStorage || !currentTenantId) return;
    // ... rest of implementation
  },
  [videoId, duration]
);
```

This pattern allows `saveCurrentProgress` to access the latest `progress`, `tenantId`, and `canUseStorage` values without depending on them in the useCallback deps array. However, the event listener effect still depends on `saveCurrentProgress` itself, causing listener churn when it's recreated.

### Proposed Solution from Ticket

Use a stable handler ref for `saveCurrentProgress`:

```typescript
const saveRef = useRef<(p:number)=>void>(()=>{});
saveRef.current = saveCurrentProgress;   // always latest logic

useEffect(() => {
  if (!player || !canUseStorage) return;

  const handleTimeUpdate = () => saveRef.current(player.currentTime);
  // ...
}, [playerRef, canUseStorage, duration]);   // <-- saveCurrentProgress removed
```

This extends the existing refs pattern to the callback itself, making the event handlers stable while always accessing the latest callback logic.

## Similar Patterns in Codebase

### Other useEffect + addEventListener Patterns

The codebase contains 10 different patterns for using `useEffect` with event listeners:

1. **Media Element Event Listeners** (`hooks/use-video-progress.ts:227-274`) - Current implementation
2. **useSyncExternalStore Pattern** (`util/use-current-player-time.ts:1-30`) - Uses React 18's useSyncExternalStore for time updates
3. **Window Scroll Listener** (`components/video-detail.tsx:115-132`) - Scroll tracking for floating player
4. **Document Keyboard Listener** (`components/search-bar.tsx:45-61`) - Global keyboard shortcuts (CMD+K)
5. **Document Click Outside** (`components/auth/user-menu.tsx:18-29`) - Close menu on outside click
6. **MediaQueryList Listener** (`components/ui/ai-assistant/index.tsx:187-196`) - Responsive breakpoints
7. **Dynamic Document Listeners** (`components/ui/ai-assistant/index.tsx:203-236`) - Drag-to-resize
8. **BroadcastChannel** (`lib/progress/sync.ts:21-64`) - Cross-tab synchronization
9. **One-time Listeners** (`components/players/player-mux.tsx:211-239`) - Using `{ once: true }`
10. **Initial Time Setup** (`components/players/player-mux.tsx:246-265`) - One-time listener for start time

### Pattern: Memoized Handler with useCallback

The scroll listener pattern in `components/video-detail.tsx:115-132` shows a similar approach to the current implementation:

```typescript
// Handle scroll behavior for floating player
const handleScroll = useCallback(() => {
  const currentScrollY = window.scrollY;
  if (currentScrollY > window.innerHeight * 0.7 && !isOutOfView) {
    setIsOutOfView(false);
  }
  if (currentScrollY < window.innerHeight * 0.7 && isOutOfView) {
    setIsOutOfView(false);
  }
  prevScrollY.current = currentScrollY;
}, [isOutOfView]);

// Set up scroll listener
useEffect(() => {
  window.addEventListener("scroll", handleScroll, { passive: true });
  return () => {
    window.removeEventListener("scroll", handleScroll);
  };
}, [handleScroll]);
```

This pattern includes the memoized handler in the effect's dependency array, similar to the current video progress implementation.

### Pattern: useSyncExternalStore (Alternative Approach)

The `use-current-player-time.ts` hook demonstrates an alternative pattern using React 18's `useSyncExternalStore`:

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

This pattern encapsulates the subscribe/unsubscribe logic in a way that React can optimize.

## Code References

### Core Implementation
- `hooks/use-video-progress.ts:227-274` - Event listener effect with listener churn issue
- `hooks/use-video-progress.ts:150-207` - saveCurrentProgress callback with useCallback
- `hooks/use-video-progress.ts:51-53` - Refs declaration (progressRef, tenantIdRef, canUseStorageRef)
- `hooks/use-video-progress.ts:62-72` - Refs synchronization effects
- `hooks/use-video-progress.ts:206` - saveCurrentProgress dependency array `[videoId, duration]`
- `hooks/use-video-progress.ts:274` - Event listener effect dependency array with saveCurrentProgress

### Related Throttling Implementation
- `hooks/use-video-progress.ts:47-48` - Throttling refs (lastSaveTimeRef, saveTimeoutRef)
- `hooks/use-video-progress.ts:163-174` - Throttling logic in saveCurrentProgress
- `lib/progress/types.ts` - PROGRESS_CONFIG.THROTTLE_INTERVAL

### Components Using the Hook
- `components/video-detail.tsx` - Main video detail page using useVideoProgress
- `components/players/player-mux.tsx` - Mux player component receiving playerRef
- `components/transcript.tsx` - Transcript component using playerRef

### Related Files
- `lib/progress/store.ts` - Progress persistence with furthestPosition tracking
- `lib/progress/sync.ts` - Cross-tab synchronization
- `lib/progress/types.ts` - Type definitions and configuration
- `util/use-current-player-time.ts` - Alternative useSyncExternalStore pattern

## Architecture Context

### Video Progress Tracking System

The video progress tracking system consists of several layers:

1. **Hook Layer** (`hooks/use-video-progress.ts`) - React integration with player events
2. **Storage Layer** (`lib/progress/store.ts`) - IndexedDB persistence
3. **Sync Layer** (`lib/progress/sync.ts`) - Cross-tab communication
4. **Component Layer** (`components/video-detail.tsx`) - UI integration

### Player Integration Flow

1. `video-detail.tsx` creates a `playerRef` using `useRef<HTMLVideoElement>(null)`
2. Passes `playerRef` to `player-mux.tsx` component
3. Calls `useVideoProgress` hook with `videoId`, `duration`, and `playerRef`
4. Hook attaches event listeners to `playerRef.current` when available
5. Event handlers call `saveCurrentProgress` on video events
6. Progress is saved to IndexedDB and synced across tabs

### Existing Performance Optimizations

The hook already implements several performance optimizations:

1. **Throttling**: Limits progress saves to `PROGRESS_CONFIG.THROTTLE_INTERVAL` (lines 159-174)
2. **Throttle bypass**: Forces immediate save on pause, seeking, and ended events
3. **Refs pattern**: Prevents stale closures for progress, tenantId, and canUseStorage
4. **Cleanup**: Clears pending timeouts on unmount or video change (lines 77-85)
5. **Conditional execution**: Early return if player or storage unavailable (line 229)

The missing optimization is preventing listener churn by making the event listener effect more stable.

## Problem Analysis

### Listener Churn Frequency

The event listener effect re-runs when:
- `playerRef` changes (expected - new video element)
- `canUseStorage` changes (expected - storage availability changed)
- `saveCurrentProgress` changes (problematic - callback recreated)
- `duration` changes (expected - new video loaded)

The `saveCurrentProgress` callback is recreated when `videoId` or `duration` changes. Since `duration` is also in the event listener effect's deps, both changes would cause re-runs anyway. However, removing `saveCurrentProgress` from the deps would still be beneficial because:

1. It makes the effect's intent clearer - it only needs to re-run when the player, storage, or duration changes
2. It prevents potential future issues if `saveCurrentProgress` gains additional dependencies
3. It maintains consistency with the existing refs pattern for other values

### Potential Race Conditions

The ticket mentions potential race conditions where an event fires after `removeEventListener` but before re-add. This could happen in the following scenario:

1. Effect cleanup runs, removing all listeners
2. Video continues playing
3. `timeupdate` event fires but is not handled
4. Effect setup runs, adding listeners back
5. Progress is not saved for that timeupdate

While the throttling would likely make missing a single `timeupdate` event insignificant, the principle of stable listeners is sound.

### GC Pressure

Each time the effect re-runs:
- Four old event handler functions are dereferenced
- Four new event handler functions are created
- Cleanup function is replaced

With frequent re-runs, this creates unnecessary garbage collection pressure.

## Related Research

- `2025-10-19-BOLD-740-stale-closures-throttled-progress.md` - Related research on stale closure issues in the same hook
- `2025-10-19-BOLD-728-anonymous-video-progress.md` - Original implementation of anonymous video progress tracking

## Open Questions

1. Does the `duration` dependency in the event listener effect serve a specific purpose, or is it only needed because `saveCurrentProgress` depends on it?
2. Would it be beneficial to apply the same refs pattern to other event listener effects in the codebase (e.g., scroll handler in video-detail.tsx)?
3. Should the `useSyncExternalStore` pattern from `use-current-player-time.ts` be considered as an alternative approach for the progress tracking?
