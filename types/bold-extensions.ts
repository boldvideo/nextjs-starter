import type { Settings } from "@boldvideo/bold-js";

/**
 * Extended theme color properties not yet in bold-js SDK
 * TODO: Remove once bold-js SDK is updated with these types
 * Linear ticket: bold-js SDK types are outdated - missing theme properties
 */
interface ExtendedThemeColors {
  accent?: string;
  "accent-foreground"?: string;
  sidebar?: string;
  "sidebar-foreground"?: string;
  "sidebar-primary"?: string;
  "sidebar-primary-foreground"?: string;
  "sidebar-accent"?: string;
  "sidebar-accent-foreground"?: string;
  "sidebar-border"?: string;
  "sidebar-ring"?: string;
}

/**
 * Extended light theme with additional properties
 */
export type ExtendedLightTheme = NonNullable<
  NonNullable<Settings["theme_config"]>["light"]
> &
  ExtendedThemeColors;

/**
 * Extended dark theme with additional properties
 */
export type ExtendedDarkTheme = NonNullable<
  NonNullable<Settings["theme_config"]>["dark"]
> &
  ExtendedThemeColors;

/**
 * Extended theme config with properly typed light/dark themes
 */
export interface ExtendedThemeConfig {
  radius?: string;
  light: ExtendedLightTheme;
  dark: ExtendedDarkTheme;
}

/**
 * Extended metadata with additional properties not yet in bold-js SDK
 */
export interface ExtendedMetaData {
  title?: string;
  title_suffix?: string;
  description?: string;
  image?: string;
  social_graph_image_url?: string;
}

/**
 * Helper to cast theme config to extended type
 */
export function asExtendedTheme(
  theme: Settings["theme_config"]
): ExtendedThemeConfig | undefined {
  return theme as ExtendedThemeConfig | undefined;
}

/**
 * Helper to cast metadata to extended type
 */
export function asExtendedMetaData(
  meta: Settings["meta_data"]
): ExtendedMetaData | undefined {
  return meta as ExtendedMetaData | undefined;
}
