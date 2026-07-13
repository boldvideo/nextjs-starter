import type { Settings } from "@boldvideo/bold-js";

export const HEADER_SIZE_MAP: Record<string, string> = {
  sm: "57px",
  md: "73px",
  lg: "97px",
};

export const DEFAULT_HEADER_HEIGHT = "73px";

interface ThemeTokens {
  radius?: string;
  light?: {
    background?: string;
    foreground?: string;
    muted?: string;
    muted_foreground?: string;
    border?: string;
    ring?: string;
    surface?: string;
    accent?: string;
    accent_foreground?: string;
  };
  dark?: {
    background?: string;
    foreground?: string;
    muted?: string;
    muted_foreground?: string;
    border?: string;
    ring?: string;
    surface?: string;
    accent?: string;
    accent_foreground?: string;
  };
}

export function getThemeFromSettings(settings: Settings | null | undefined): ThemeTokens | null {
  return settings?.portal?.theme || settings?.themeConfig || null;
}

export function getHeaderHeight(settings: Settings | null | undefined): string | null {
  const headerSize = settings?.portal?.theme?.headerSize;
  if (!headerSize) return null;
  return HEADER_SIZE_MAP[headerSize] || DEFAULT_HEADER_HEIGHT;
}

export function getCssOverrides(settings: Settings | null | undefined): string | null {
  return settings?.portal?.theme?.cssOverrides || null;
}

// Defaults: neutral warm grays for any keys a tenant theme leaves unset.
// The old oklch defaults carried a teal hue (175) into every gray, which
// tinted body text mint whenever a tenant theme was partially configured.
export function generateThemeCss(theme: ThemeTokens): string {
  return `
    :root {
      --radius: ${theme.radius || "0.75rem"};
      --background: ${theme.light?.background || "#ffffff"};
      --foreground: ${theme.light?.foreground || "#0c0c0b"};
      --muted: ${theme.light?.muted || "#f5f5f3"};
      --muted-foreground: ${theme.light?.muted_foreground || "#52524f"};
      --border: ${theme.light?.border || "#e5e5e2"};
      --ring: ${theme.light?.ring || "#0d9488"};
      --surface: ${theme.light?.surface || "#fafaf9"};
      --accent: ${theme.light?.accent || "#0d9488"};
      --accent-foreground: ${theme.light?.accent_foreground || "#ffffff"};
      --primary: ${theme.light?.accent || "#0d9488"};
    }
    .dark {
      --background: ${theme.dark?.background || "#0a0a09"};
      --foreground: ${theme.dark?.foreground || "#fafaf9"};
      --muted: ${theme.dark?.muted || "#161614"};
      --muted-foreground: ${theme.dark?.muted_foreground || "#a8a8a1"};
      --border: ${theme.dark?.border || "#1e1e1c"};
      --ring: ${theme.dark?.ring || "#2dd4bf"};
      --surface: ${theme.dark?.surface || "#0e0e0d"};
      --accent: ${theme.dark?.accent || "#2dd4bf"};
      --accent-foreground: ${theme.dark?.accent_foreground || "#04201c"};
      --primary: ${theme.dark?.accent || "#2dd4bf"};
    }
  `;
}

export function generateHeaderHeightCss(headerHeight: string): string {
  return `
    @media (min-width: 768px) {
      :root {
        --header-height: ${headerHeight};
      }
    }
  `;
}
