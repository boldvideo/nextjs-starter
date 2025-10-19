---
date: 2025-10-19
ticket: BOLD-742
status: implemented
repository: boldvideo/nextjs-starter
branch: feat/progress-furthest-position-continue-watching
---

# IndexedDB Position Validation & Availability Probing

## Overview

Fix two edge cases in video progress tracking: (1) invalid position values from `HTMLVideoElement.currentTime` being stored in IndexedDB, and (2) superficial IndexedDB availability checking that doesn't detect actual storage failures.

## Current State Analysis

**Position Validation**: No validation exists for `player.currentTime` values. The hook directly stores whatever the browser returns, which can include NaN, negative values, Infinity, or values exceeding duration. This corrupts progress data and breaks resume functionality.

**IndexedDB Availability**: `isIndexedDBAvailable()` at `lib/progress/store.ts:183-189` only checks `typeof indexedDB !== 'undefined'` without attempting to access the database. This misses private mode restrictions, quota limits, and permission issues.

### Key Discoveries:

- Position values flow unvalidated: `hooks/use-video-progress.ts:236,241,248,257` → `store.ts:105`
- `Math.max(NaN, n)` returns NaN, corrupting `furthestPosition` at `store.ts:92-95`
- `(NaN / duration) * 100` produces NaN percentage, breaking completion detection at `store.ts:98-99`
- Current probe doesn't catch Safari private mode, quota exceeded, or permission revocation
- Errors already fail gracefully with try-catch, but we waste cycles on doomed operations

## Desired End State

Clean, validated position data and accurate storage availability detection with minimal overhead.

### Verification:

- Position values are finite, non-negative, and within duration bounds
- Corrupted existing records are discarded on load
- `isIndexedDBAvailable()` accurately detects unusable storage
- No performance degradation from validation overhead

## What We're NOT Doing

- User notifications for storage failures (silent degradation)
- Active migration to clean existing corrupted records
- Specific error type handling (QuotaExceededError, etc.)
- Retry mechanisms for failed saves
- Periodic re-checking of availability during playback

## Implementation Approach

Two focused phases: (1) add position validation with a clean utility function, (2) make availability check probe actual database access. Keep it simple and elegant.

---

## Phase 1: Position Validation

### Overview

Add validation for position values before storage and discard corrupted data on load.

### Changes Required:

#### 1. Validation Utility

**File**: `lib/progress/validation.ts` (new)
**Changes**: Create position validation utility

```typescript
/**
 * Validate video position value
 * Ensures position is finite, non-negative, and within bounds
 * Allows 10% buffer beyond duration for browser edge cases
 */
export function isValidPosition(
  position: number,
  duration: number
): boolean {
  if (!Number.isFinite(position) || !Number.isFinite(duration)) return false;
  if (duration <= 0) return false;

  const buffer = duration * 0.1; // 10% buffer
  return position >= 0 && position <= duration + buffer;
}

/**
 * Validate a complete progress record
 * Checks all numeric fields for corruption
 */
export function isValidProgressRecord(
  record: ProgressRecord
): boolean {
  return (
    Number.isFinite(record.position) &&
    Number.isFinite(record.furthestPosition) &&
    Number.isFinite(record.duration) &&
    Number.isFinite(record.percentWatched) &&
    record.position >= 0 &&
    record.furthestPosition >= 0 &&
    record.duration > 0 &&
    record.percentWatched >= 0 &&
    record.percentWatched <= 100
  );
}
```

#### 2. Store Layer Validation

**File**: `lib/progress/store.ts`
**Changes**:
- Import validation utilities
- Validate position before saving at line 78
- Validate record when loading at line 65

```typescript
// Add import at top
import { isValidPosition, isValidProgressRecord } from './validation';

// In saveProgress(), after line 82, before any calculations:
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
    // ... rest of existing save logic
  }
}

// In getProgress(), after line 65, validate before returning:
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
```

#### 3. Type System Documentation

**File**: `lib/progress/types.ts`
**Changes**: Add JSDoc comments clarifying runtime validation

```typescript
/** Last playback position in seconds (for resume)
 * Runtime validated: must be finite, non-negative, <= duration
 */
position: number;

/** Furthest position ever watched in seconds (for progress bars)
 * Runtime validated: must be finite, non-negative, <= duration
 */
furthestPosition: number;

/** Total video duration in seconds
 * Runtime validated: must be finite, positive
 */
duration: number;
```

### Success Criteria:

#### Automated Verification:

- [x] TypeScript compilation passes: `npm run build`
- [x] ESLint passes: `npm run lint`
- [x] New validation file exports correct types

#### Manual Verification:

- [ ] Invalid positions (NaN, negative, > duration) are rejected and logged
- [ ] Valid positions save successfully
- [ ] Corrupted existing records return null on load
- [ ] New clean record can be saved after corrupted one is discarded
- [ ] Resume functionality works with validated positions

---

## Phase 2: IndexedDB Availability Probing

### Overview

Replace type check with actual database access probe to catch private mode, quota, and permission issues.

### Changes Required:

#### 1. Enhanced Availability Check

**File**: `lib/progress/store.ts`
**Changes**: Replace `isIndexedDBAvailable()` at line 183 with actual probe

```typescript
/**
 * Check if IndexedDB is available and usable
 * Performs actual database access to catch private mode, quota, permissions
 */
export async function isIndexedDBAvailable(): Promise<boolean> {
  try {
    // Type check first
    if (typeof indexedDB === 'undefined') {
      return false;
    }

    // Probe: try to open a temporary database
    const testDB = await openDB('__bold_test__', 1);
    await testDB.close();

    // Clean up test database
    indexedDB.deleteDatabase('__bold_test__');

    return true;
  } catch {
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
```

#### 2. Hook Integration

**File**: `hooks/use-video-progress.ts`
**Changes**: Use sync check for initial render, async probe in effect

```typescript
// At line 59, use sync check for initial canUseStorage:
const canUseStorage = enabled && isIndexedDBDefined() && tenantId !== null;

// Add new effect after line 72 to probe actual availability:
useEffect(() => {
  if (!enabled || !tenantId) {
    canUseStorageRef.current = false;
    return;
  }

  // Async probe on mount
  isIndexedDBAvailable().then((available) => {
    canUseStorageRef.current = available;
  });
}, [enabled, tenantId]);
```

### Success Criteria:

#### Automated Verification:

- [x] TypeScript compilation passes: `npm run build`
- [x] ESLint passes: `npm run lint`
- [x] Both sync and async functions export correctly

#### Manual Verification:

- [ ] Safari private mode correctly detected as unavailable
- [ ] Normal mode correctly detected as available
- [ ] Probe runs once per mount without noticeable delay
- [ ] Failed save operations still degrade gracefully
- [ ] No test databases left in storage after probe

---

## Testing Strategy

### Unit Tests:

- `isValidPosition(position, duration)` edge cases:
  - Returns false for NaN, Infinity, negative
  - Returns false for position > duration * 1.1
  - Returns true for valid positions including 0 and duration
- `isValidProgressRecord(record)` validates all numeric fields
- `isIndexedDBDefined()` returns boolean without errors

### Integration Tests:

- Position validation blocks invalid values from reaching storage
- Corrupted records are discarded on load
- New valid record can be saved after corruption
- Availability probe correctly detects private mode
- Probe completes within reasonable time (<100ms)

### Manual Testing Steps:

1. **Invalid Position Handling**:
   - Seek video during loading (may produce NaN)
   - Verify console warning logged
   - Verify no corrupted data in IndexedDB (DevTools → Application → IndexedDB)

2. **Corrupted Record Recovery**:
   - Manually corrupt a record via DevTools (set position to NaN)
   - Reload page
   - Verify record is discarded and fresh one can be saved

3. **Private Mode Detection**:
   - Open in Safari private mode
   - Verify availability check returns false
   - Verify no save attempts made

4. **Normal Operation**:
   - Play video in normal mode
   - Verify progress saves correctly
   - Verify resume position works
   - Verify completion detection works

## Performance Considerations

- Position validation is O(1) with simple arithmetic checks
- Probe happens once per component mount (typically once per page load)
- Probe creates minimal test database (<1KB) that's immediately deleted
- No impact on playback or save performance
- Consider if probe should be cached globally (future optimization)

## Migration Notes

No active migration needed. Corrupted records are discarded on first load, and fresh validated data is written on next save operation. This provides lazy cleanup as users watch videos.

## References

- Original research: `thoughts/shared/research/2025-10-19-BOLD-742-indexeddb-probe-position-validation.md`
- Position sources: `hooks/use-video-progress.ts:236,241,248,257`
- Storage layer: `lib/progress/store.ts:78-122`
- Type definitions: `lib/progress/types.ts:5-35`
