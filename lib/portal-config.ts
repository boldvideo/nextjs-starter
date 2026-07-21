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
  // Fork override: the ask-page intro is design-owned copy in the show's
  // voice (line 1 renders as the headline, the rest as body).
  const aiGreeting = [
    "You're on. Ask us anything.",
    "Every episode of Startup Requests Live is in here — the pitch deck teardowns, the fundraising math, the brutally honest go-to-market advice. Ask what you'd submit to the show and get the answer now, with the exact moments where Ed, Wil & Ryan covered it.",
    '',
    "What are you working on?",
  ].join('\n');

  // Conversation starters: persona first, then assistant_config, then defaults
  const defaultStarters = [
    'What kills most pitch decks in the first 30 seconds?',
    'How much should I raise for my pre-seed round?',
    'Do investors actually care about my competition slide?'
  ];
  const conversationStarters = personaEnabled && persona.conversationStarters?.length > 0
    ? persona.conversationStarters
    : (settings.portal?.layout?.assistantConfig?.suggestions?.length
        ? settings.portal.layout.assistantConfig.suggestions
        : defaultStarters);

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

  // Fork override: startups.com has exactly one nav bar (the fixed 68px
  // SrlBar mounted by the layout), so the portal's secondary header row
  // stays off regardless of tenant settings.
  const showHeader = false;

  // Fork override: startups.com runs both modes with a nav toggle
  // (moon/sun next to the logo, dark by default) — same here. The two
  // palettes live in globals.css.
  const colorScheme = 'toggle' as 'toggle' | 'light' | 'dark';
  const forcedTheme = null as 'light' | 'dark' | null;
  const showToggle = true;

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
