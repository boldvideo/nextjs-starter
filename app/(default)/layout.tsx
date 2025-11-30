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

// Force dynamic rendering — tenant depends on hostname in hosted mode
export const dynamic = "force-dynamic";

// Default metadata values
const defaultMetadata = {
  title: "Bold Video x Next.js Starter Kit",
  description:
    "Bold Video Starter Kit: Supercharge videos, rapid encoding/transcription.",
  ogImage: `https://og.boldvideo.io/api/og-image?text=${encodeURIComponent(
    "Bold Video x Next.js Starter Kit"
  )}`,
  siteUrl: "https://starter-demo.bold.video",
};

export async function generateMetadata(): Promise<Metadata> {
  const context = await getTenantContext();

  if (!context?.settings) {
    return {
      title: defaultMetadata.title,
      description: defaultMetadata.description,
      openGraph: {
        title: defaultMetadata.title,
        description: defaultMetadata.description,
        url: defaultMetadata.siteUrl,
        siteName: defaultMetadata.title,
        images: [
          {
            url: defaultMetadata.ogImage,
            width: 1200,
            height: 630,
          },
        ],
        locale: "en-US",
        type: "website",
      },
    };
  }

  const settings = context.settings;
  const meta = settings.meta_data as ExtendedMetaData | undefined;
  const title = meta?.title
    ? `${meta.title}${meta.title_suffix || ""}`
    : defaultMetadata.title;
  const description = meta?.description || defaultMetadata.description;
  const ogImageUrl =
    meta?.social_graph_image_url ||
    `https://og.boldvideo.io/api/og-image?text=${encodeURIComponent(title)}${
      meta?.image ? `&img=${encodeURIComponent(meta.image)}` : ""
    }`;

  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      url: defaultMetadata.siteUrl,
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
      icon: settings.favicon_url || "/favicon.ico",
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

  // Check if user should see content
  const showContent = !isAuthEnabled() || session;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
