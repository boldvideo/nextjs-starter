import type { Settings } from "@boldvideo/bold-js";

// Re-export Settings type from SDK (0.6.0+)
export type PortalSettings = Settings;

// Configuration with smart defaults
export interface PortalConfig {
  ai: {
    enabled: boolean;
    name: string;
    avatar: string;
    greeting: string;
    showInHeader: boolean;
    conversationStarters: string[];
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
    showHeader: boolean;
  };
  display: {
    showTranscripts: boolean;
    showChapters: boolean;
  };
  theme: {
    colorScheme: 'toggle' | 'light' | 'dark';
    forcedTheme: 'light' | 'dark' | null;
    showToggle: boolean;
  };
  hero: {
    enabled: boolean;
    type: 'none' | 'custom';
  };
}

/**
 * Normalizes settings from API
 * With SDK 0.6.0+, the API returns complete Settings structure
 */
export function normalizeSettings(settings: Settings | null): Settings | null {
  return settings;
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
export function getPortalConfig(rawSettings: Settings | null): PortalConfig {
  const settings = normalizeSettings(rawSettings);

  if (!settings) {
    // Return safe defaults if no settings
    return {
      ai: {
        enabled: false,
        name: 'AI Assistant',
        avatar: '/placeholder-avatar.png',
        greeting: 'Hello! How can I help you today?',
        showInHeader: false,
        conversationStarters: []
      },
      homepage: {
        layout: 'library',
        videosLimit: 12,
        showPlaylists: true
      },
      navigation: {
        showSearch: true,
        showAiToggle: false,
        showHeader: true
      },
      display: {
        showTranscripts: true,
        showChapters: true
      },
      theme: {
        colorScheme: 'toggle',
        forcedTheme: null,
        showToggle: true
      },
      hero: {
        enabled: false,
        type: 'none'
      }
    };
  }

  // Check for environment variable overrides (server-side only)
  const layoutOverride = typeof process !== 'undefined'
    ? process.env.PORTAL_LAYOUT_OVERRIDE as 'none' | 'library' | 'assistant' | undefined
    : undefined;

  // Determine AI configuration (with backward compatibility for legacy fields)
  const aiEnabled = settings.account?.ai?.enabled ?? settings.hasAi ?? false;
  const aiAvatarRaw = settings.account?.ai?.avatarUrl ?? settings.aiAvatar;
  const aiAvatar = ensureAbsoluteUrl(aiAvatarRaw);

  // New AI Search visibility check (replaces showAiSearch from portal.navigation)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aiSearchEnabled = (settings.account as any)?.aiSearch?.enabled ??
                          settings.portal?.navigation?.showAiSearch ??
                          false;

  // Persona configuration (new in bold-js 1.0.1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const persona = (settings.account as any)?.persona;
  const personaEnabled = persona?.enabled === true;

  // Override AI name/greeting from persona if enabled, with fallbacks
  const legacyAiName = settings.account?.ai?.name ?? settings.aiName ?? 'AI Assistant';
  const legacyAiGreeting = settings.account?.ai?.greeting ?? settings.aiGreeting ?? 'Hello! How can I help you today?';

  const aiName = personaEnabled && persona.name ? persona.name : legacyAiName;
  const aiGreeting = personaEnabled && persona.greeting ? persona.greeting : legacyAiGreeting;

  // Conversation starters: persona first, then assistant_config, then defaults
  const defaultStarters = [
    'How can I improve my product?',
    'What are best practices for scaling?',
    'How do I manage my team better?'
  ];
  const conversationStarters = personaEnabled && persona.conversationStarters?.length > 0
    ? persona.conversationStarters
    : settings.portal?.layout?.assistantConfig?.suggestions ?? defaultStarters;

  // Determine homepage layout
  const homepageLayout = (layoutOverride ?? settings.portal?.layout?.type ?? 'library') as 'none' | 'library' | 'assistant';

  // Smart derivation: Show AI toggle in header if:
  // 1. AI is enabled
  // 2. AI search is enabled
  // 3. AI is NOT the primary homepage (to avoid duplication)
  const showAiInHeader = aiEnabled &&
                         aiSearchEnabled &&
                         homepageLayout !== 'assistant';

  // Smart header visibility:
  // 1. Use explicit showHeader setting from API (SDK 0.6.0+)
  // 2. Default to true (show header)
  const showHeader = settings.portal?.navigation?.showHeader ?? true;

  // Theme configuration (bold-js 1.2.0: colorScheme consolidated into portal.theme)
  const colorScheme = (settings.portal?.theme?.colorScheme ?? settings.portal?.colorScheme ?? 'toggle') as 'toggle' | 'light' | 'dark';
  const forcedTheme = colorScheme === 'toggle' ? null : colorScheme;
  const showToggle = colorScheme === 'toggle';

  return {
    ai: {
      enabled: aiEnabled,
      name: aiName,
      avatar: aiAvatar,
      greeting: aiGreeting,
      showInHeader: showAiInHeader,
      conversationStarters: conversationStarters
    },
    homepage: {
      layout: homepageLayout,
      videosLimit: settings.portal?.layout?.videosLimit ?? 12,
      showPlaylists: settings.portal?.layout?.showPlaylists ?? true,
      assistantConfig: homepageLayout === 'assistant' ? {
        headline: settings.portal?.layout?.assistantConfig?.headline ??
                 'Get 1,000 hours of coaching in 60 seconds.',
        subheadline: settings.portal?.layout?.assistantConfig?.subheadline ??
                    'Our AI assistant is here to help you.',
        suggestions: settings.portal?.layout?.assistantConfig?.suggestions ?? [
          'How can I improve my product?',
          'What are best practices for scaling?',
          'How do I manage my team better?'
        ]
      } : undefined
    },
    navigation: {
      showSearch: settings.portal?.navigation?.showSearch ?? true,
      showAiToggle: showAiInHeader,
      showHeader: showHeader
    },
    display: {
      showTranscripts: settings.portal?.display?.showTranscripts ?? true,
      showChapters: settings.portal?.display?.showChapters ?? true
    },
    theme: {
      colorScheme,
      forcedTheme,
      showToggle
    },
    hero: {
      enabled: (settings.portal?.hero?.type ?? 'none') !== 'none',
      type: (settings.portal?.hero?.type ?? 'none') as 'none' | 'custom'
    }
  };
}
