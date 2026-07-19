import type { Settings, AnalyticsProvider } from "@boldvideo/bold-js";

// Re-export Settings type from SDK (0.6.0+)
export type PortalSettings = Settings;

// Analytics configuration - valid only when both provider and id are present
export interface AnalyticsConfig {
  provider: AnalyticsProvider;
  id: string;
}

// Configuration with smart defaults
export interface PortalConfig {
  ai: {
    enabled: boolean;
    name: string;
    avatar: string;
    greeting: string;
    showInHeader: boolean;
    conversationStarters: string[];
    chatDisclaimer?: string;
    multimodal: {
      enabled: boolean;
      maxImages: number;
      acceptedMediaTypes: string[];
    };
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
  analytics: AnalyticsConfig | null;
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
        conversationStarters: [],
        chatDisclaimer: undefined,
        multimodal: {
          enabled: false,
          maxImages: 0,
          acceptedMediaTypes: [],
        }
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
      },
      analytics: null
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

  // The AI settings (account.ai) are the source of truth for name/greeting —
  // the persona block often carries stale duplicates, so it only fills gaps.
  // (Its conversation starters are still used below.)
  const aiName =
    settings.account?.ai?.name ??
    (personaEnabled ? persona?.name : undefined) ??
    settings.aiName ??
    'AI Assistant';
  // Fork override: the ask-page intro is design-owned copy in Taki's
  // voice (line 1 renders as the headline, the rest as body).
  const aiGreeting = [
    "G'day 👋 I'm Taki AI.",
    "Every video Taki's ever filmed is in my head. The pricing plays. The bit where he fired his entire sales team and made more money. Ask me what you'd normally save for a coaching call and you'll get the straight answer, plus the exact clip so you can watch him say it himself.",
    '',
    'What are we working on?',
  ].join('\n');

  // Conversation starters: persona first, then assistant_config, then defaults
  const defaultStarters = [
    'How can I improve my product?',
    'What are best practices for scaling?',
    'How do I manage my team better?'
  ];
  const conversationStarters = personaEnabled && persona.conversationStarters?.length > 0
    ? persona.conversationStarters
    : settings.portal?.layout?.assistantConfig?.suggestions ?? defaultStarters;

  // Chat disclaimer (bold-js 1.15.1+)
  const chatDisclaimer = settings.chatDisclaimer;

  // Multimodal capability (BOLD-1495). The SDK normalizes settings keys to
  // camelCase, but the underlying API contract uses snake_case — accept either.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const multimodalRaw = (settings.account as any)?.multimodal;
  const multimodalMaxImages =
    typeof multimodalRaw?.maxImages === "number"
      ? multimodalRaw.maxImages
      : typeof multimodalRaw?.max_images === "number"
        ? multimodalRaw.max_images
        : 0;
  const multimodalAcceptedMediaTypes = Array.isArray(multimodalRaw?.acceptedMediaTypes)
    ? (multimodalRaw.acceptedMediaTypes as string[])
    : Array.isArray(multimodalRaw?.accepted_media_types)
      ? (multimodalRaw.accepted_media_types as string[])
      : [];
  const multimodal = {
    enabled: multimodalRaw?.enabled === true,
    maxImages: multimodalMaxImages,
    acceptedMediaTypes: multimodalAcceptedMediaTypes,
  };

  // Determine homepage layout
  const homepageLayout = (layoutOverride ?? settings.portal?.layout?.type ?? 'library') as 'none' | 'library' | 'assistant';

  // Show the Ask pill in the header whenever the AI assistant is enabled
  // (and AI isn't already the homepage). Deliberately NOT tied to the
  // separate "AI search" feature — /ask runs on ai.enabled, and disabling
  // AI search in admin shouldn't remove the portal's hero nav element.
  const showAiInHeader = aiEnabled && homepageLayout !== 'assistant';

  // The "search with AI" toggle inside the search dialog does depend on the
  // AI search feature.
  const showAiSearchToggle = showAiInHeader && aiSearchEnabled;

  // Smart header visibility:
  // 1. Use explicit showHeader setting from API (SDK 0.6.0+)
  // 2. Default to true (show header)
  const showHeader = settings.portal?.navigation?.showHeader ?? true;

  // Fork override: theming is HumanLayer's data-theme system (globals.css),
  // so next-themes is pinned to light with no toggle — the site bar's
  // paintbrush switcher owns the look.
  const colorScheme = 'light' as 'toggle' | 'light' | 'dark';
  const forcedTheme = 'light' as 'light' | 'dark' | null;
  const showToggle = false;

  return {
    ai: {
      enabled: aiEnabled,
      name: aiName,
      avatar: aiAvatar,
      greeting: aiGreeting,
      showInHeader: showAiInHeader,
      conversationStarters: conversationStarters,
      chatDisclaimer,
      multimodal
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
      showAiToggle: showAiSearchToggle,
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
    },
    analytics: parseAnalyticsConfig(settings)
  };
}

function parseAnalyticsConfig(settings: Settings): AnalyticsConfig | null {
  // Handle both flat (SDK types) and nested (current API) structures
  const analytics = (settings.portal as { analytics?: { provider?: string; siteId?: string } })?.analytics;
  const provider = settings.portal?.analyticsProvider ?? analytics?.provider;
  const id = settings.portal?.analyticsId ?? analytics?.siteId;

  if (!provider || !id) return null;

  return { provider: provider as AnalyticsConfig["provider"], id };
}
