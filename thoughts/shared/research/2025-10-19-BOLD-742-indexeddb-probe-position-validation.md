---
date: 2025-10-19T14:35:43+02:00
researcher: Claude
git_commit: 533d51ff2bd3c47da2c7bbf92d40ec5ef9739b65
branch: feat/progress-furthest-position-continue-watching
repository: boldvideo/nextjs-starter
topic: "IndexedDB Probe & Position Validation Edge Cases"
tags: [research, codebase, video-progress, indexeddb, edge-cases, validation]
status: complete
last_updated: 2025-10-19
last_updated_by: Claude
---

# Research: IndexedDB Probe & Position Validation Edge Cases

**Date**: 2025-10-19T14:35:43+02:00
**Researcher**: Claude
**Git Commit**: 533d51ff2bd3c47da2c7bbf92d40ec5ef9739b65
**Branch**: feat/progress-furthest-position-continue-watching
**Repository**: boldvideo/nextjs-starter

## Research Question

Document the current implementation of IndexedDB availability checking and position value handling in the video progress tracking system, specifically focusing on edge cases identified in BOLD-742:

**A)** How `isIndexedDBAvailable()` currently works and when `canUseStorage` can become stale
**B)** How position values from `HTMLVideoElement.currentTime` are validated before storage

## Summary

The video progress tracking system currently has two unguarded edge cases:

**IndexedDB Availability**: The `isIndexedDBAvailable()` function at `lib/progress/store.ts:183-189` performs only a type check (`typeof indexedDB !== 'undefined'`) without actually probing the database. The `canUseStorage` flag is calculated once on render at `hooks/use-video-progress.ts:59` and can become stale if IndexedDB becomes unavailable mid-session (e.g., Safari private mode toggle, quota exceeded).

**Position Validation**: Position values from `player.currentTime` are passed directly to storage without validation at four call sites in `hooks/use-video-progress.ts` (lines 237, 244, 251, 257). No checks exist for NaN, negative values, or values exceeding duration. These raw values are stored directly in IndexedDB at `lib/progress/store.ts:105` and used in calculations that could produce invalid results.

## Detailed Findings

### A) IndexedDB Availability Checking

#### Current Implementation

**Location**: `lib/progress/store.ts:183-189`

```typescript
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}
```

**Detection Mechanism**:
- **Type check only**: Uses `typeof indexedDB !== 'undefined'`
- **No actual probing**: Does not attempt to open a database or test write operations
- **No quota verification**: Cannot detect quota exceeded conditions
- **No permission checks**: Cannot detect permission changes

#### Stale canUseStorage Issue

**Location**: `hooks/use-video-progress.ts:59`

```typescript
const canUseStorage = enabled && isIndexedDBAvailable() && tenantId !== null;
```

**Current Behavior**:
- `canUseStorage` is calculated once per render (not reactive state)
- Value is computed during component render phase
- Synced to ref at `hooks/use-video-progress.ts:70-72`:

```typescript
useEffect(() => {
  canUseStorageRef.current = canUseStorage;
}, [canUseStorage]);
```

**When Value Becomes Stale**:

The `canUseStorage` flag will not update if:

1. **Safari private mode toggle**: User switches from normal to private browsing mid-session
2. **Quota exceeded**: IndexedDB quota fills up during playback
3. **Permission revocation**: Browser permissions change during session
4. **Extension interference**: Ad blockers or privacy extensions disable IndexedDB

In these scenarios:
- `canUseStorageRef.current` remains `true`
- Event handlers at `hooks/use-video-progress.ts:235-258` continue calling `saveProgressRef.current()`
- `saveCurrentProgress` at line 157 checks `currentCanUseStorage` and returns early
- Save operations fail silently in `lib/progress/store.ts:118-121`
- User loses progress data without notification

#### Storage Availability Dependencies

**Calculation Chain**:

1. `enabled` prop (user opt-in, default `true`)
2. `isIndexedDBAvailable()` result (type check)
3. `tenantId !== null` (tenant identification)

**All three** must be true for storage operations to proceed.

**Related Code**:
- Guard in `saveCurrentProgress`: `hooks/use-video-progress.ts:157`
- Guard in `loadProgress` effect: `hooks/use-video-progress.ts:91`
- Guard in sync effect: `hooks/use-video-progress.ts:133`
- Guard in `clearProgress`: `hooks/use-video-progress.ts:217`
- Guard in event listener effect: `hooks/use-video-progress.ts:233`

### B) Position Value Handling

#### Position Sources

Position values originate from `HTMLVideoElement.currentTime` at four locations in `hooks/use-video-progress.ts`:

**1. handleTimeUpdate** (line 235-238)
```typescript
const handleTimeUpdate = () => {
  const position = player.currentTime;
  saveProgressRef.current(position);
};
```

**2. handlePause** (line 240-245)
```typescript
const handlePause = () => {
  const position = player.currentTime;
  // Force immediate save on pause (bypass throttle)
  lastSaveTimeRef.current = 0;
  saveProgressRef.current(position);
};
```

**3. handleSeeking** (line 247-252)
```typescript
const handleSeeking = () => {
  const position = player.currentTime;
  // Force immediate save on seek (bypass throttle)
  lastSaveTimeRef.current = 0;
  saveProgressRef.current(position);
};
```

**4. handleEnded** (line 254-258)
```typescript
const handleEnded = () => {
  // Mark as complete (100% position)
  lastSaveTimeRef.current = 0;
  saveProgressRef.current(duration);
};
```

**Note**: `handleEnded` uses `duration` instead of `player.currentTime`, which avoids position validation issues for completion but relies on the passed `duration` prop being valid.

#### Current Validation

**No validation exists** at any point in the data flow:

**At Call Sites** (`hooks/use-video-progress.ts:235-258`):
- No checks for `isNaN(position)`
- No checks for `position < 0`
- No checks for `position > duration`
- No checks for `isFinite(position)`

**In saveCurrentProgress** (`hooks/use-video-progress.ts:150-207`):
- Position parameter accepted as-is
- Passed directly to `saveProgress()` at line 180

**In saveProgress** (`lib/progress/store.ts:78-122`):
- Position stored directly at line 105: `position,`
- Used in `Math.max()` at line 92-95 without validation
- Used in percentage calculation at line 98

#### Potential Invalid Values

`HTMLVideoElement.currentTime` can return:

1. **NaN**: During metadata loading or seek operations
2. **Negative values**: Browser quirks or corrupted media
3. **Values > duration**: During scrubbing or before metadata loaded
4. **Infinity**: Mathematical edge cases

#### Impact on Storage

**Direct Storage** (`lib/progress/store.ts:105`):
```typescript
const record: ProgressRecord = {
  id: key,
  videoId,
  tenantId,
  position,              // ❌ Stored without validation
  furthestPosition,
  duration,
  percentWatched,
  completed,
  lastWatched: new Date().toISOString(),
  version: PROGRESS_CONFIG.VERSION,
};
```

**Furthest Position Calculation** (`lib/progress/store.ts:92-95`):
```typescript
const furthestPosition = Math.max(
  position,
  existingRecord?.furthestPosition || 0
);
```

If `position` is NaN:
- `Math.max(NaN, 0)` returns `NaN`
- `furthestPosition` becomes `NaN`
- Stored in database as `NaN`

**Percentage Calculation** (`lib/progress/store.ts:98`):
```typescript
const percentWatched = Math.min((furthestPosition / duration) * 100, 100);
```

If `furthestPosition` is NaN or `duration` is 0:
- `(NaN / duration) * 100` → `NaN`
- `(furthestPosition / 0) * 100` → `Infinity`
- `Math.min(NaN, 100)` → `NaN`
- `Math.min(Infinity, 100)` → `100`

**Completion Check** (`lib/progress/store.ts:99`):
```typescript
const completed = percentWatched >= PROGRESS_CONFIG.COMPLETION_THRESHOLD;
```

If `percentWatched` is NaN:
- `NaN >= 90` → `false`
- Video never marked completed even if fully watched

#### Type System

**Type Definition** (`lib/progress/types.ts:16`):
```typescript
position: number;
```

TypeScript's `number` type includes:
- Finite numbers (normal case)
- `NaN` (special number value)
- `Infinity` and `-Infinity`

No runtime validation enforces finite, non-negative values.

### C) Error Handling Patterns

#### Storage Operation Failures

All storage operations use try-catch with graceful degradation:

**saveProgress** (`lib/progress/store.ts:118-121`):
```typescript
catch (error) {
  console.warn('[ProgressStore] Failed to save progress:', error);
  // Fail silently - feature degrades gracefully
}
```

**getProgress** (`lib/progress/store.ts:67-70`):
```typescript
catch (error) {
  console.warn('[ProgressStore] Failed to get progress:', error);
  return null;
}
```

**Error Types NOT Specifically Handled**:
- `QuotaExceededError` (storage quota)
- `InvalidStateError` (database closed)
- `NotFoundError` (database deleted)
- `VersionError` (schema conflicts)

All errors produce the same behavior: log warning and continue.

#### Hook-Level Error Handling

**loadProgress** (`hooks/use-video-progress.ts:102-119`):
```typescript
try {
  const existingProgress = await getProgress(tenantId, videoId);
  // ... state updates
} catch (error) {
  console.warn('[useVideoProgress] Failed to load progress:', error);
} finally {
  if (mounted) {
    setIsLoading(false);
  }
}
```

**saveCurrentProgress** (`hooks/use-video-progress.ts:179-204`):
```typescript
try {
  await saveProgress(currentTenantId, videoId, position, duration);
  // ... state updates
} catch (error) {
  console.warn('[useVideoProgress] Failed to save progress:', error);
}
```

**Pattern**: State updates occur inside try blocks. On error, state remains unchanged.

## Code References

### IndexedDB Availability
- `lib/progress/store.ts:183-189` - `isIndexedDBAvailable()` implementation
- `hooks/use-video-progress.ts:59` - `canUseStorage` calculation
- `hooks/use-video-progress.ts:70-72` - Ref synchronization

### Position Flow
- `hooks/use-video-progress.ts:236` - `handleTimeUpdate` position source
- `hooks/use-video-progress.ts:241` - `handlePause` position source
- `hooks/use-video-progress.ts:248` - `handleSeeking` position source
- `hooks/use-video-progress.ts:257` - `handleEnded` (uses duration)
- `hooks/use-video-progress.ts:180` - Position passed to `saveProgress()`
- `lib/progress/store.ts:105` - Position stored to IndexedDB
- `lib/progress/store.ts:92-95` - Position used in `Math.max()` for furthest calculation
- `lib/progress/store.ts:98` - Furthest position used in percentage calculation

### Configuration
- `lib/progress/types.ts:5-35` - `ProgressRecord` type definition
- `lib/progress/types.ts:40-47` - `PROGRESS_CONFIG` constants
- `lib/progress/types.ts:44` - `COMPLETION_THRESHOLD: 90`
- `lib/progress/types.ts:45` - `THROTTLE_INTERVAL: 2500`

### Error Handling
- `lib/progress/store.ts:38-44` - Database initialization (only place that throws)
- `lib/progress/store.ts:67-70` - `getProgress` error handling
- `lib/progress/store.ts:118-121` - `saveProgress` error handling
- `hooks/use-video-progress.ts:102-119` - Load progress error handling
- `hooks/use-video-progress.ts:179-204` - Save progress error handling

## Architecture Documentation

### Data Flow

```
HTMLVideoElement.currentTime
  ↓
Event Handlers (timeupdate, pause, seeking, ended)
  ↓
saveProgressRef.current(position)  ← No validation
  ↓
saveCurrentProgress(position: number)  ← Throttling only
  ↓
saveProgress(tenantId, videoId, position, duration)  ← No validation
  ↓
IndexedDB.put(record)  ← NaN/Infinity/negative values stored
  ↓
broadcastProgressUpdate()  ← Other tabs notified
```

### Availability Check Flow

```
Component Render
  ↓
canUseStorage = enabled && isIndexedDBAvailable() && tenantId !== null
  ↓ (one-time calculation)
useEffect(() => canUseStorageRef.current = canUseStorage, [canUseStorage])
  ↓
Event handlers check canUseStorageRef.current
  ↓ (if false)
Return early, no save
  ↓ (if true but DB actually unavailable)
saveProgress() fails in try-catch
  ↓
Silent failure with console.warn
```

### State Management

**Hook State**:
- `progress: ProgressRecord | null` - Current video progress
- `isLoading: boolean` - Initial load state
- `resumePosition: number | null` - Where to resume playback

**Refs** (avoid stale closures):
- `progressRef` - Current progress record
- `tenantIdRef` - Current tenant ID
- `canUseStorageRef` - Storage availability flag
- `saveProgressRef` - Latest save callback
- `lastSaveTimeRef` - Throttling timestamp
- `saveTimeoutRef` - Pending save timeout

**Derived Values** (computed on render):
- `canUseStorage` - Combines enabled, availability, and tenant checks
- `tenantId` - From settings via `getTenantId()`

## Edge Case Scenarios

### Scenario 1: Safari Private Mode Toggle

**Current Behavior**:
1. User starts video in normal mode
2. `canUseStorage` calculated as `true`
3. Progress saves successfully
4. User switches to private browsing
5. `canUseStorage` remains `true` (stale)
6. Event handlers continue calling save
7. `saveProgress()` fails silently
8. User loses progress without notification

**Why**:
- `isIndexedDBAvailable()` only checks type, not actual availability
- `canUseStorage` is not reactive state
- No periodic re-check of availability

### Scenario 2: Quota Exceeded

**Current Behavior**:
1. IndexedDB quota fills up
2. Next `saveProgress()` call throws `QuotaExceededError`
3. Error caught in try-catch at `lib/progress/store.ts:118-121`
4. Warning logged to console
5. Function returns (void)
6. User continues watching
7. No progress saved, no user notification

**Why**:
- No specific handling for `QuotaExceededError`
- No retry mechanism
- No user notification system
- Graceful degradation treats all errors the same

### Scenario 3: NaN Position During Seek

**Current Behavior**:
1. User drags seek bar while video loading
2. `player.currentTime` returns `NaN`
3. `handleSeeking` calls `saveProgressRef.current(NaN)`
4. `saveProgress(tenantId, videoId, NaN, duration)` called
5. `Math.max(NaN, previousFurthest || 0)` → `NaN`
6. `furthestPosition = NaN` stored in DB
7. `(NaN / duration) * 100` → `NaN`
8. `percentWatched = NaN` stored in DB
9. `NaN >= 90` → `false`, video never marked complete

**Why**:
- No validation at any layer
- `Math.max()` propagates NaN
- Division by any number with NaN produces NaN
- Comparison with NaN always returns false

### Scenario 4: Negative Position (Browser Quirk)

**Current Behavior**:
1. Browser bug or corrupted media returns `currentTime = -5`
2. `handleTimeUpdate` calls `saveProgressRef.current(-5)`
3. `saveProgress(tenantId, videoId, -5, duration)` called
4. `Math.max(-5, previousFurthest || 0)` → `max(previousFurthest, 0)`
5. `furthestPosition` unaffected (saved by Math.max)
6. `position = -5` stored in DB
7. Resume position becomes -5
8. Player seeks to negative time (behavior undefined)

**Why**:
- `position` stored directly without bounds check
- `furthestPosition` protected by `Math.max()` but `position` is not
- Resume functionality uses raw `position` value

### Scenario 5: Position > Duration

**Current Behavior**:
1. User seeks past end during buffering
2. `player.currentTime` returns `duration + 100`
3. `handleSeeking` calls `saveProgressRef.current(duration + 100)`
4. `saveProgress(tenantId, videoId, duration + 100, duration)` called
5. `Math.max(duration + 100, previousFurthest || 0)` → `duration + 100`
6. `furthestPosition = duration + 100` stored
7. `((duration + 100) / duration) * 100` → `>100%`
8. `Math.min(>100, 100)` → `100`
9. `percentWatched = 100`, video marked complete incorrectly

**Why**:
- No upper bound validation
- `furthestPosition` can exceed `duration`
- Percentage calculation capped at 100 but completion triggered early
- Resume position can be beyond video end

## Related Research

- `thoughts/shared/research/2025-10-19-BOLD-741-player-event-handler-listener-churn.md` - Event listener stability (completed)
- `thoughts/shared/research/2025-10-19-BOLD-740-stale-closures-throttled-progress.md` - Stale closure fixes (completed)

## Open Questions

1. **Frequency of edge cases**: How often do browsers return NaN/negative/out-of-bounds values in production?
2. **Safari private mode detection**: Can we detect mode changes without polling?
3. **Quota monitoring**: Can we detect approaching quota limits proactively?
4. **User notification**: Should users be notified when progress saving fails?
5. **Data recovery**: Should corrupted records (NaN values) be cleaned up or migrated?
