import type { Settings } from "@boldvideo/bold-js";

// Extended settings interface with new portal configuration
export interface PortalSettings extends Omit<Settings, 'ai_name' | 'ai_avatar' | 'ai_greeting' | 'has_ai'> {
  // New account structure
  account?: {
    ai?: {
      enabled: boolean;
      name: string;
      avatar_url: string;
      greeting: string;
    };
    name: string;
    slug: string;
  };
  
  // New portal configuration
  portal?: {
    layout?: {
      type?: 'none' | 'library' | 'assistant';
      videos_limit?: number;
      show_playlists?: boolean;
      assistant_config?: {
        headline?: string;
        subheadline?: string;
        suggestions?: string[];
      };
    };
    navigation?: {
      show_search?: boolean;
      show_ai_search?: boolean;
    };
    display?: {
      show_transcripts?: boolean;
      show_chapters?: boolean;
    };
    theme?: {
      background?: string | null;
      foreground?: string | null;
      primary?: string | null;
      font_header?: string;
      font_body?: string;
      logo_url?: string | null;
      logo_width?: number | null;
      logo_height?: number | null;
    };
  };
  
  // Legacy AI fields for backward compatibility
  has_ai?: boolean;
  ai_name?: string;
  ai_avatar?: string;
  ai_greeting?: string;
}

// Configuration with smart defaults
export interface PortalConfig {
  ai: {
    enabled: boolean;
    name: string;
    avatar: string;
    greeting: string;
    showInHeader: boolean;
  };
  homepage: {
    layout: 'none' | 'library' | 'assistant';
    videosLimit: number;
    showPlaylists: boolean;
    assistantConfig?: {
      headline: string;
      subheadline: string;
      suggestions: string[];
    };
  };
  navigation: {
    showSearch: boolean;
    showAiToggle: boolean;
  };
  display: {
    showTranscripts: boolean;
    showChapters: boolean;
  };
}

/**
 * Normalizes settings to handle both old and new API structures
 * Provides backward compatibility for existing deployments
 */
export function normalizeSettings(settings: Settings | PortalSettings | null): PortalSettings {
  if (!settings) return {} as PortalSettings;
  
  // Type guard to check if it's a PortalSettings with account property
  const portalSettings = settings as PortalSettings;
  
  // If new account.ai structure exists, use it
  // Otherwise, create it from legacy fields
  const legacySettings = settings as Settings;
  if (!portalSettings.account?.ai && (legacySettings.has_ai || legacySettings.ai_name)) {
    // Ensure account exists with required fields
    if (!portalSettings.account) {
      portalSettings.account = {
        name: 'BOLD Portal',
        slug: 'portal'
      };
    }
    portalSettings.account.ai = {
      enabled: legacySettings.has_ai ?? false,
      name: legacySettings.ai_name || 'AI Assistant',
      avatar_url: legacySettings.ai_avatar || '/placeholder-avatar.png',
      greeting: 'Hello! How can I help you today?' // Default greeting - Settings type doesn't have this field
    };
  }
  
  // Ensure portal configuration exists with defaults
  if (!portalSettings.portal) {
    portalSettings.portal = {
      layout: {
        type: 'library',
        videos_limit: 12,
        show_playlists: true
      },
      navigation: {
        show_search: true,
        show_ai_search: false
      },
      display: {
        show_transcripts: true,
        show_chapters: true
      }
    };
  }
  
  return portalSettings;
}

/**
 * Helper to ensure avatar URLs are absolute
 */
function ensureAbsoluteUrl(url: string | undefined): string {
  if (!url) return '/placeholder-avatar.png';
  
  // If it's already an absolute URL, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If it starts with uploads/ (relative path from API), prepend the base URL
  if (url.startsWith('uploads/')) {
    return `https://uploads.eu1.boldvideo.io/${url}`;
  }
  
  // If it starts with /, assume it's a local asset
  if (url.startsWith('/')) {
    return url;
  }
  
  // Otherwise, assume it needs the uploads prefix
  return `https://uploads.eu1.boldvideo.io/${url}`;
}

/**
 * Gets the effective portal configuration with smart defaults
 * Handles environment variable overrides for development
 */
export function getPortalConfig(rawSettings: any): PortalConfig {
  const settings = normalizeSettings(rawSettings);
  
  // Check for environment variable overrides (server-side only)
  const layoutOverride = typeof process !== 'undefined' 
    ? process.env.PORTAL_LAYOUT_OVERRIDE as 'none' | 'library' | 'assistant' | undefined
    : undefined;
  
  // Determine AI configuration
  const aiEnabled = settings.account?.ai?.enabled ?? settings.has_ai ?? false;
  const aiName = settings.account?.ai?.name ?? settings.ai_name ?? 'AI Assistant';
  const aiAvatarRaw = settings.account?.ai?.avatar_url ?? settings.ai_avatar;
  const aiAvatar = ensureAbsoluteUrl(aiAvatarRaw);
  const aiGreeting = settings.account?.ai?.greeting ?? settings.ai_greeting ?? 'Hello! How can I help you today?';
  
  // Determine homepage layout
  const homepageLayout = layoutOverride ?? settings.portal?.layout?.type ?? 'library';
  
  // Smart derivation: Show AI toggle in header if:
  // 1. AI is enabled
  // 2. AI is NOT the primary homepage (to avoid duplication)
  // 3. Portal settings allow it
  const showAiInHeader = aiEnabled && 
                         homepageLayout !== 'assistant' &&
                         (settings.portal?.navigation?.show_ai_search ?? false);
  
  return {
    ai: {
      enabled: aiEnabled,
      name: aiName,
      avatar: aiAvatar,
      greeting: aiGreeting,
      showInHeader: showAiInHeader
    },
    homepage: {
      layout: homepageLayout,
      videosLimit: settings.portal?.layout?.videos_limit ?? 12,
      showPlaylists: settings.portal?.layout?.show_playlists ?? true,
      assistantConfig: homepageLayout === 'assistant' ? {
        headline: settings.portal?.layout?.assistant_config?.headline ?? 
                 'Get 1,000 hours of coaching in 60 seconds.',
        subheadline: settings.portal?.layout?.assistant_config?.subheadline ?? 
                    'Our AI assistant is here to help you.',
        suggestions: settings.portal?.layout?.assistant_config?.suggestions ?? [
          'How can I improve my product?',
          'What are best practices for scaling?',
          'How do I manage my team better?'
        ]
      } : undefined
    },
    navigation: {
      showSearch: settings.portal?.navigation?.show_search ?? true,
      showAiToggle: showAiInHeader
    },
    display: {
      showTranscripts: settings.portal?.display?.show_transcripts ?? true,
      showChapters: settings.portal?.display?.show_chapters ?? true
    }
  };
}