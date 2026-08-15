import type { Metadata } from "next";
import { headers } from "next/headers";
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
import { SpeedInsights } from "@vercel/speed-insights/next";
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
import { fixUploadUrl } from "@/lib/utils";

// Force dynamic rendering — tenant depends on hostname in hosted mode
export const dynamic = "force-dynamic";

// Default metadata values - only used as fallback when settings unavailable
const defaultMetadata = {
  title: "Video Portal",
  description: "",
};

export async function generateMetadata(): Promise<Metadata> {
  const context = await getTenantContext();

  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host") || headersList.get("host") || "";
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || (host ? `https://${host}` : "");
  const metadataBase = baseUrl ? new URL(baseUrl) : undefined;

  if (!context?.settings) {
    return {
      metadataBase,
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
  // Top-level portal name is in the payload but not yet in the SDK types
  const portalName = (settings as unknown as { name?: string }).name;
  const title = meta?.title
    ? `${meta.title}${meta.titleSuffix || ""}`
    : portalName || defaultMetadata.title;
  const description = meta?.description || defaultMetadata.description;

  // Tenant-uploaded social image wins; otherwise the local /og route renders
  // a card from the portal's name, logo, fonts, and theme colors.
  const ogImageUrl = fixUploadUrl(meta?.socialGraphImageUrl) || "/og";

  return {
    metadataBase,
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      url: baseUrl,
      siteName: portalName || title,
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
    // Explicit favicon wins; otherwise /favicon derives one from the header
    // logo (normalized to square PNG); static Bold icon as last resort.
    icons: fixUploadUrl(settings.faviconUrl)
      ? { icon: fixUploadUrl(settings.faviconUrl) }
      : settings.logoUrl
        ? { icon: "/favicon", apple: "/favicon?size=180" }
        : { icon: "/favicon.ico" },
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

  // Get fonts from settings. The SDK camelizes API keys (fontHeader/fontBody);
  // snake_case kept as fallback for raw payloads.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const themeAny = theme as any;
  const fontHeaderVar = getFontVar(themeAny?.fontHeader || themeAny?.font_header);
  const fontBodyVar = getFontVar(themeAny?.fontBody || themeAny?.font_body);

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
        className="bg-background flex flex-col h-[100dvh] overflow-hidden lg:overflow-auto"
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
        <SpeedInsights />
      </body>
    </html>
  );
}
