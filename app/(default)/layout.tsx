import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "./globals.css";

import { getTenantContext } from "@/lib/get-tenant-context";
import { isHostedMode } from "@/lib/tenant";
import { LayoutWithPlaylist } from "@/components/layout-with-playlist";
import { AppProviders } from "@/components/providers/app-providers";
import { BoldProvider } from "@/components/providers/bold-provider";
import { getPortalConfig } from "@/lib/portal-config";
import { Analytics } from "@/components/analytics";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getCssOverrides } from "@/lib/theme-css";
import { gymFontVariables } from "@/lib/gym-fonts";
import {
  gymMeta,
  GYM_BASE_URL,
  GYM_DEFAULT_TITLE,
  GYM_SITE_NAME,
} from "@/lib/gym-meta";

// Fork override: this build is single-tenant standalone (no hostname
// resolution), so pages render static with ISR instead of per-request.
export const revalidate = 60;

export const viewport = {
  // Matches the night-purple arcade floor
  themeColor: "#0b0618",
};

export async function generateMetadata(): Promise<Metadata> {
  // Share metadata is fork-owned (lib/gym-meta.ts). The tenant's description
  // is written for the fictional-demo disclosure, and its default card is
  // replaced by the game's static homepage card.
  return {
    // No headers() here — it would force every page dynamic and kill ISR.
    metadataBase: new URL(GYM_BASE_URL),
    title: { default: GYM_DEFAULT_TITLE, template: `%s · ${GYM_SITE_NAME}` },
    applicationName: GYM_SITE_NAME,
    ...gymMeta(),
    // Fork: the pixel joystick (our own art) beats any tenant favicon.
    icons: { icon: "/gym/icon.svg", apple: "/gym/apple-icon.png" },
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

  const cssOverrides = getCssOverrides(settings);

  // Get portal configuration to determine if we should show header
  const config = getPortalConfig(settings);
  const showHeader = config.navigation.showHeader;

  // Fork is design-owned: Space Grotesk for reading, Bungee (.font-display)
  // for the arcade moments, VT323 (.font-osd) for VHS on-screen text.
  // Tenant font settings are intentionally ignored.
  const fontHeaderVar = "var(--font-space-grotesk)";
  const fontBodyVar = "var(--font-space-grotesk)";

  // The settings payload rides to the client in every page's RSC stream.
  // featuredPlaylists carries full video objects (transcripts, subtitles,
  // chapters) — ~290KB nothing client-side in this skin reads.
  const clientSettings = settings ? { ...settings, featuredPlaylists: [] } : null;

  return (
    <html lang="en" suppressHydrationWarning className={gymFontVariables}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Receipt thumbnails and frame previews come from Mux */}
        <link rel="preconnect" href="https://image.mux.com" />
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
        {/* Tenant theme tokens and header sizing are deliberately NOT
            injected in this fork — globals.css is the design source of
            truth (the game theme, incl. the bar baked into --header-height). */}
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
          {/* Sign-in is optional (Better Auth, client-side session) so every
              page stays static; nothing here reads cookies. */}
          <AppProviders
            settings={clientSettings}
            themeConfig={{ ...config.theme, forcedTheme: "dark" }}
          >
            <LayoutWithPlaylist settings={clientSettings} showHeader={showHeader}>
              {children}
            </LayoutWithPlaylist>
          </AppProviders>
        </BoldProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
