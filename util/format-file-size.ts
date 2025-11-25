/**
 * Formats a number of bytes into a human-readable string (e.g., "1.5 MB", "300 KB").
 * @param bytes The number of bytes to format.
 * @param decimals The number of decimal places to include (default: 0).
 * @returns The formatted string.
 */
export function formatFileSize(bytes: number, decimals: number = 0): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
