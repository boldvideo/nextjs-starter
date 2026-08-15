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

/**
 * Convert an OKLCH color string to hex. Inverse of hexToOklch, using
 * Björn Ottosson's OKLab ↔ linear sRGB matrices. Accepts both number
 * (0.97) and percentage (97%) lightness. Returns null if unparseable.
 */
export function oklchToHex(oklch: string): string | null {
  const match = oklch
    .trim()
    .match(
      /^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:\/\s*[\d.%]+\s*)?\)$/i
    );
  if (!match) return null;

  const L = match[1].endsWith("%")
    ? parseFloat(match[1]) / 100
    : parseFloat(match[1]);
  const C = parseFloat(match[2]);
  const H = parseFloat(match[3]);

  // OKLCH -> OKLab
  const hRad = (H * Math.PI) / 180;
  const labA = C * Math.cos(hRad);
  const labB = C * Math.sin(hRad);

  // OKLab -> LMS (cube roots)
  const lPrime = L + 0.3963377774 * labA + 0.2158037573 * labB;
  const mPrime = L - 0.1055613458 * labA - 0.0638541728 * labB;
  const sPrime = L - 0.0894841775 * labA - 1.291485548 * labB;

  const l = lPrime * lPrime * lPrime;
  const m = mPrime * mPrime * mPrime;
  const s = sPrime * sPrime * sPrime;

  // LMS -> linear sRGB
  const linearR = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const linearG = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const linearB = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  // Gamma encode + clamp to sRGB gamut
  const encode = (v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    const srgb =
      clamped <= 0.0031308
        ? clamped * 12.92
        : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
    return Math.round(srgb * 255)
      .toString(16)
      .padStart(2, "0");
  };

  return `#${encode(linearR)}${encode(linearG)}${encode(linearB)}`;
}

/**
 * Normalize a CSS color from tenant settings to hex for renderers that
 * don't speak modern CSS color spaces (satori/OG images). Passes hex and
 * legacy formats through; converts oklch; falls back otherwise.
 */
export function cssColorToHex(
  color: string | undefined | null,
  fallback: string
): string {
  if (!color) return fallback;
  const trimmed = color.trim();
  if (trimmed.toLowerCase().startsWith("oklch(")) {
    return oklchToHex(trimmed) || fallback;
  }
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed) || /^rgba?\(/i.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}
