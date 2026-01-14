import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "./globals.css";

import { getTenantContext } from "@/lib/get-tenant-context";
import { isHostedMode } from "@/lib/tenant";
import { LayoutWithPlaylist } from "@/components/layout-with-playlist";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { AppProviders } from "@/components/providers/app-providers";
import { BoldProvider } from "@/components/providers/bold-provider";
import { getPortalConfig } from "@/lib/portal-config";
import { Analytics } from "@/components/analytics";
import {
  getThemeFromSettings,
  getHeaderHeight,
  getCssOverrides,
  generateThemeCss,
  generateHeaderHeightCss,
} from "@/lib/theme-css";
import { auth } from "@/auth";
import { isAuthEnabled } from "@/config/auth";
import SignIn from "@/components/auth/sign-in";
import type { ExtendedMetaData } from "@/types/bold-extensions";
import { getAllFontVariables, getFontVar } from "@/lib/fonts";

// Force dynamic rendering — tenant depends on hostname in hosted mode
export const dynamic = "force-dynamic";

// Default metadata values - only used as fallback when settings unavailable
const defaultMetadata = {
  title: "Video Portal",
  description: "",
};

export async function generateMetadata(): Promise<Metadata> {
  const context = await getTenantContext();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";

  if (!context?.settings) {
    return {
      title: defaultMetadata.title,
      description: defaultMetadata.description,
      openGraph: {
        title: defaultMetadata.title,
        description: defaultMetadata.description,
        url: baseUrl,
        siteName: defaultMetadata.title,
        locale: "en-US",
        type: "website",
      },
    };
  }

  const settings = context.settings;
  const meta = settings.metaData as ExtendedMetaData | undefined;
  const title = meta?.title
    ? `${meta.title}${meta.titleSuffix || ""}`
    : defaultMetadata.title;
  const description = meta?.description || defaultMetadata.description;
  
  // Fix upload URLs - ensure they point to the correct bucket
  const fixUploadUrl = (url: string | undefined) => {
    if (!url) return undefined;
    // Handle relative paths (with or without leading slash)
    if (url.startsWith("uploads/")) {
      return `https://uploads.eu1.boldvideo.io/${url}`;
    }
    if (url.startsWith("/uploads/")) {
      return `https://uploads.eu1.boldvideo.io${url}`;
    }
    // Handle any domain with /uploads/ path
    if (url.includes("/uploads/")) {
      return url.replace(/^https?:\/\/[^/]+\/uploads\//, "https://uploads.eu1.boldvideo.io/uploads/");
    }
    return url;
  };
  
  const ogImageUrl =
    fixUploadUrl(meta?.socialGraphImageUrl) ||
    `https://og.boldvideo.io/api/og-image?text=${encodeURIComponent(title)}${
      meta?.image ? `&img=${encodeURIComponent(fixUploadUrl(meta.image) || meta.image)}` : ""
    }`;

  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      url: baseUrl,
      siteName: title,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
        },
      ],
      locale: "en-US",
      type: "website",
    },
    icons: {
      icon: settings.faviconUrl || "/favicon.ico",
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Resolve tenant context for the current request
  const context = await getTenantContext();

  // Handle missing tenant
  if (!context) {
    // In hosted mode, invalid domain returns 404
    // In standalone mode, this is a config error
    if (isHostedMode()) {
      notFound();
    }
    throw new Error(
      "BOLD_API_KEY is required in standalone mode. Check your environment configuration."
    );
  }

  const { settings, tenantToken } = context;

  // Get auth session if auth is enabled
  const session = isAuthEnabled() ? await auth() : null;

  // Theme configuration (BOLD-925, BOLD-924)
  const theme = getThemeFromSettings(settings);
  const cssOverrides = getCssOverrides(settings);
  const headerHeight = getHeaderHeight(settings);

  // Get portal configuration to determine if we should show header
  const config = getPortalConfig(settings);
  const showHeader = config.navigation.showHeader;

  // Get fonts from settings (font_header and font_body fields in portal.theme or theme_config)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const themeAny = theme as any;
  const fontHeaderVar = getFontVar(themeAny?.font_header);
  const fontBodyVar = getFontVar(themeAny?.font_body);

  // Check if user should see content
  const showContent = !isAuthEnabled() || session;

  return (
    <html lang="en" suppressHydrationWarning className={getAllFontVariables()}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --font-heading: ${fontHeaderVar};
                --font-body: ${fontBodyVar};
              }
            `,
          }}
        />
        {theme && (
          <style
            dangerouslySetInnerHTML={{ __html: generateThemeCss(theme) }}
          />
        )}
        {headerHeight && (
          <style
            dangerouslySetInnerHTML={{
              __html: generateHeaderHeightCss(headerHeight),
            }}
          />
        )}
        {cssOverrides && (
          <style
            dangerouslySetInnerHTML={{
              __html: cssOverrides,
            }}
          />
        )}
      </head>
      <body
        className="bg-background flex flex-col h-screen overflow-hidden lg:min-h-screen lg:h-auto lg:overflow-auto"
        suppressHydrationWarning
      >
        <Analytics config={config.analytics} />
        <BoldProvider
          token={tenantToken}
          baseURL={process.env.BACKEND_URL || "https://app.boldvideo.io/api/v1"}
        >
          {showContent ? (
            <AppProviders
              session={session}
              settings={settings}
              themeConfig={config.theme}
            >
              <LayoutWithPlaylist
                settings={settings}
                session={session}
                showHeader={showHeader}
              >
                {children}
              </LayoutWithPlaylist>
            </AppProviders>
          ) : (
            <SettingsProvider settings={settings}>
              <SignIn settings={settings ?? undefined} />
            </SettingsProvider>
          )}
        </BoldProvider>
      </body>
    </html>
  );
}
