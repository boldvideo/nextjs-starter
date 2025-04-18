/**
 * Convert timestamp string like HH:MM:SS.ms, MM:SS.ms, or SS.ms to seconds.
 * Handles potential floating point seconds.
 */
export const timestampToSeconds = (timestamp: string): number => {
  const parts = timestamp.split(":").map(Number);
  let hours = 0,
    minutes = 0,
    seconds = 0;

  if (parts.length === 3) {
    [hours, minutes, seconds] = parts;
  } else if (parts.length === 2) {
    [minutes, seconds] = parts;
  } else if (parts.length === 1) {
    [seconds] = parts; // Assuming the single part is seconds
  }

  // Use parseFloat on the seconds part to handle potential milliseconds
  // Use the value directly if it's already a number (from map(Number))
  const rawSeconds = parts[parts.length - 1];
  seconds =
    typeof rawSeconds === "number" ? parseFloat(rawSeconds.toString()) : 0;

  // Reconstruct total seconds using potentially fractional seconds
  if (parts.length === 3) {
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    return minutes * 60 + seconds;
  } else {
    return seconds;
  }
};

/**
 * Convert timestamp in seconds to readable format (MM:SS)
 */
export const secondsToReadableTime = (totalSeconds: number): string => {
  // Handle potential NaN or non-finite numbers gracefully
  if (isNaN(totalSeconds) || !isFinite(totalSeconds)) {
    return "00:00";
  }
  const minutesPart = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const secondsPart = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutesPart}:${secondsPart}`;
};

// Optional: Add other time-related utilities here if needed
