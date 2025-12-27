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

export function generateThemeCss(theme: ThemeTokens): string {
  return `
    :root {
      --radius: ${theme.radius || "0.5rem"};
      --background: ${theme.light?.background || "oklch(0.98 0.02 95)"};
      --foreground: ${theme.light?.foreground || "oklch(0.22 0.04 175)"};
      --muted: ${theme.light?.muted || "oklch(0.96 0.01 95)"};
      --muted-foreground: ${theme.light?.muted_foreground || "oklch(0.45 0.03 175)"};
      --border: ${theme.light?.border || "oklch(0.90 0.02 95)"};
      --ring: ${theme.light?.ring || "oklch(0.73 0.12 175)"};
      --surface: ${theme.light?.surface || "oklch(0.99 0.01 95)"};
      --accent: ${theme.light?.accent || "oklch(0.73 0.12 175)"};
      --accent-foreground: ${theme.light?.accent_foreground || "oklch(0.22 0.04 175)"};
      --primary: ${theme.light?.accent || "oklch(0.73 0.12 175)"};
    }
    .dark {
      --background: ${theme.dark?.background || "oklch(0.18 0.02 175)"};
      --foreground: ${theme.dark?.foreground || "oklch(0.96 0.01 95)"};
      --muted: ${theme.dark?.muted || "oklch(0.25 0.02 175)"};
      --muted-foreground: ${theme.dark?.muted_foreground || "oklch(0.65 0.03 175)"};
      --border: ${theme.dark?.border || "oklch(0.30 0.02 175)"};
      --ring: ${theme.dark?.ring || "oklch(0.73 0.12 175)"};
      --surface: ${theme.dark?.surface || "oklch(0.22 0.02 175)"};
      --accent: ${theme.dark?.accent || "oklch(0.73 0.12 175)"};
      --accent-foreground: ${theme.dark?.accent_foreground || "oklch(0.18 0.02 175)"};
      --primary: ${theme.dark?.accent || "oklch(0.73 0.12 175)"};
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
