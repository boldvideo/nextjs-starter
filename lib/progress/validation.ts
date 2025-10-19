import type { ProgressRecord } from './types';

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
