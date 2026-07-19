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
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getCssOverrides } from "@/lib/theme-css";
import { auth } from "@/auth";
import { isAuthEnabled } from "@/config/auth";
import SignIn from "@/components/auth/sign-in";
import type { ExtendedMetaData } from "@/types/bold-extensions";
import { getAllFontVariables, getFontVar } from "@/lib/fonts";

// Force dynamic rendering — tenant depends on hostname in hosted mode
export const dynamic = "force-dynamic";

export const viewport = {
  // Matches the Taki paper-white chrome
  themeColor: "#faf9f6",
};

// Default metadata values - used as fallback when settings don't provide them
const defaultMetadata = {
  title: "Taki AI — Ask Me Anything (I've Probably Filmed It)",
  description:
    "Taki Moore's entire video library, one question away. Ask about getting clients, filling paid workshops, selling without sales calls, or scaling your coaching business — and get the answer with the exact clip it came from.",
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
  
  // Tenant-uploaded social image wins; otherwise our own branded /og card.
  const ogImageUrl =
    fixUploadUrl(meta?.socialGraphImageUrl) ||
    `/og?t=${encodeURIComponent(String(title))}`;

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
      icon: "/taki-icon.svg",
      apple: "/icon-pwa?size=180",
    },
    appleWebApp: {
      capable: true,
      title: String(title),
      statusBarStyle: "default" as const,
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
  const cssOverrides = getCssOverrides(settings);

  // Get portal configuration to determine if we should show header
  const config = getPortalConfig(settings);
  const showHeader = config.navigation.showHeader;

  // Fork is design-owned: the Taki stack is fixed in code — Bricolage
  // Grotesque headings, Inter body, Permanent Marker + Caveat for the
  // hand-drawn brand moments. Tenant font settings are intentionally
  // ignored here.
  const fontHeaderVar = getFontVar("Bricolage Grotesque");
  const fontBodyVar = getFontVar("DM Sans");

  // Check if user should see content
  const showContent = !isAuthEnabled() || session;

  return (
    <html lang="en" suppressHydrationWarning className={getAllFontVariables()}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Thumbnails, storyboards, and frame previews all come from Mux */}
        <link rel="preconnect" href="https://image.mux.com" />
        <link rel="dns-prefetch" href="https://image.mux.com" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --font-heading: ${fontHeaderVar};
                --font-body: ${fontBodyVar};
                --font-mono-brand: var(--font-jetbrains-mono), monospace;
                --font-marker: ${getFontVar("Permanent Marker")};
                --font-scribble: ${getFontVar("Caveat")};
              }
            `,
          }}
        />
        {/* Tenant theme tokens and header sizing are deliberately NOT
            injected in this fork — globals.css is the design source of
            truth (the Taki whiteboard theme, incl. the site bar baked
            into --header-height). */}
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
        {config.analytics && <Analytics config={config.analytics} />}
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
