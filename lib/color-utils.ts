/**
 * Color conversion utilities for theming
 */

/**
 * Convert a 6-character hex color to OKLCH format
 * @param hex - 6-character hex color string (without #)
 * @returns OKLCH color string or null if invalid
 */
export function hexToOklch(hex: string): string | null {
  // Validate hex format (6 characters, valid hex digits)
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    return null;
  }

  // Parse RGB values
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  // Convert sRGB to linear RGB
  const linearR = r <= 0.04045 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const linearG = g <= 0.04045 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const linearB = b <= 0.04045 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  // Convert linear RGB to XYZ (D65)
  const x = 0.4124564 * linearR + 0.3575761 * linearG + 0.1804375 * linearB;
  const y = 0.2126729 * linearR + 0.7151522 * linearG + 0.0721750 * linearB;
  const z = 0.0193339 * linearR + 0.1191920 * linearG + 0.9503041 * linearB;

  // Convert XYZ to LMS
  const l = 0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z;
  const m = 0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z;
  const s = 0.0482003018 * x + 0.2643662691 * y + 0.6338517070 * z;

  // Apply cube root
  const lPrime = Math.cbrt(l);
  const mPrime = Math.cbrt(m);
  const sPrime = Math.cbrt(s);

  // Convert to OKLab
  const labL = 0.2104542553 * lPrime + 0.7936177850 * mPrime - 0.0040720468 * sPrime;
  const labA = 1.9779984951 * lPrime - 2.4285922050 * mPrime + 0.4505937099 * sPrime;
  const labB = 0.0259040371 * lPrime + 0.7827717662 * mPrime - 0.8086757660 * sPrime;

  // Convert OKLab to OKLCH
  const oklchL = labL;
  const oklchC = Math.sqrt(labA * labA + labB * labB);
  const oklchH = Math.atan2(labB, labA) * (180 / Math.PI);

  // Normalize hue to 0-360
  const normalizedH = oklchH < 0 ? oklchH + 360 : oklchH;

  // Format as OKLCH string (rounded to reasonable precision)
  return `oklch(${(oklchL * 100).toFixed(1)}% ${oklchC.toFixed(3)} ${normalizedH.toFixed(1)})`;
}
