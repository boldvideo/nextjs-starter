import type { Metadata } from "next";
import "./globals.css";

import { bold } from "@/client";
import type { Settings } from "@boldvideo/bold-js";
import { LayoutWithPlaylist } from "@/components/layout-with-playlist";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { AppProviders } from "@/components/providers/app-providers";
import { getPortalConfig } from "@/lib/portal-config";
import { auth } from "@/auth";
import { isAuthEnabled } from "@/config/auth";
import SignIn from "@/components/auth/sign-in";
import type {
  ExtendedThemeConfig,
  ExtendedMetaData,
} from "@/types/bold-extensions";

// Default metadata values
const defaultMetadata = {
  title: "Bold Video x Next.js Starter Kit",
  description:
    "Bold Video Starter Kit: Supercharge videos, rapid encoding/transcription.",
  ogImage: `https://og.boldvideo.io/api/og-image?text=${encodeURIComponent(
    "Bold Video x Next.js Starter Kit",
  )}`,
  siteUrl: "https://starter-demo.bold.video",
};

export async function generateMetadata(): Promise<Metadata> {
  let settings: Settings | null = null;

  try {
    const settingsResponse = await bold.settings();
    settings = settingsResponse.data;
  } catch (error) {
    console.error("Failed to fetch settings for metadata:", error);
    // Use default metadata if fetch fails
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

  const meta = settings?.meta_data as ExtendedMetaData | undefined;
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
      url: defaultMetadata.siteUrl, // Assuming site URL is constant for now
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
    // Add dynamic icons
    icons: {
      icon: settings?.favicon_url || "/favicon.ico", // Use fetched url or default
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get auth session if auth is enabled
  const session = isAuthEnabled() ? await auth() : null;
  let settings: Settings | null = null;

  try {
    const settingsResponse = await bold.settings();
    settings = settingsResponse.data;
  } catch (error) {
    console.error("Failed to fetch settings for layout:", error);
  }

  const theme = settings?.theme_config as ExtendedThemeConfig | undefined;

  // Get portal configuration to determine if we should show header
  const config = getPortalConfig(settings);
  const showHeader = config.navigation.showHeader;

  // Check if user should see content
  const showContent = !isAuthEnabled() || session;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Favicon is now handled by generateMetadata */}
        {/* {settings.favicon_url && (
          <link rel="icon" href={settings.favicon_url} sizes="any" />
        )} */}
        {theme && (
          <style
            dangerouslySetInnerHTML={{
              __html: `
              :root {
                --radius: ${theme.radius || "0.5rem"}; /* Add fallback */

                --background: ${theme.light.background || "hsl(0 0% 100%)"};
                --foreground: ${
                  theme.light.foreground || "hsl(222.2 84% 4.9%)"
                };
                --card: ${theme.light.card || "hsl(0 0% 100%)"};
                --popover: ${theme.light.popover || "hsl(0 0% 100%)"};
                --card-foreground: ${
                  theme.light["card-foreground"] || "hsl(222.2 84% 4.9%)"
                };
                --popover-foreground: ${
                  theme.light["popover-foreground"] || "hsl(222.2 84% 4.9%)"
                };
                --primary: ${theme.light.primary || "hsl(222.2 47.4% 11.2%)"};
                --primary-foreground: ${
                  theme.light["primary-foreground"] || "hsl(210 40% 98%)"
                };
                --secondary: ${theme.light.secondary || "hsl(210 40% 96.1%)"};
                --secondary-foreground: ${
                  theme.light["secondary-foreground"] || "hsl(222.2 47.4% 11.2%)"
                };
                --muted: ${theme.light.muted || "hsl(210 40% 96.1%)"};
                --muted-foreground: ${
                  theme.light["muted-foreground"] || "hsl(215.4 16.3% 46.9%)"
                };
                --accent: ${theme.light.accent || "hsl(210 40% 96.1%)"};
                --accent-foreground: ${
                  theme.light["accent-foreground"] || "hsl(222.2 47.4% 11.2%)"
                };
                --destructive: ${
                  theme.light.destructive || "hsl(0 84.2% 60.2%)"
                };
                --destructive-foreground: ${
                  theme.light["destructive-foreground"] || "hsl(0 0% 100%)"
                };
                --border: ${theme.light.border || "hsl(214.3 31.8% 91.4%)"};
                --input: ${theme.light.input || "hsl(214.3 31.8% 91.4%)"};
                --ring: ${theme.light.ring || "hsl(222.2 84% 4.9%)"};
                --sidebar: ${
                  theme.light.sidebar || "hsl(0 0% 100%)"
                };
                --sidebar-foreground: ${
                  theme.light["sidebar-foreground"] || "hsl(222.2 84% 4.9%)"
                };
                --sidebar-primary: ${
                  theme.light["sidebar-primary"] || "hsl(222.2 47.4% 11.2%)"
                };
                --sidebar-primary-foreground: ${
                  theme.light["sidebar-primary-foreground"] || "hsl(210 40% 98%)"
                };
                --sidebar-accent: ${
                  theme.light["sidebar-accent"] || "hsl(210 40% 96.1%)"
                };
                --sidebar-accent-foreground: ${
                  theme.light["sidebar-accent-foreground"] ||
                  "hsl(222.2 47.4% 11.2%)"
                };
                --sidebar-border: ${
                  theme.light["sidebar-border"] || "hsl(214.3 31.8% 91.4%)"
                };
                --sidebar-ring: ${
                  theme.light["sidebar-ring"] || "hsl(222.2 84% 4.9%)"
                };
              }

              .dark {
                 --background: ${
                   theme.dark.background || "hsl(222.2 84% 4.9%)"
                 };
                --foreground: ${theme.dark.foreground || "hsl(210 40% 98%)"};
                --card: ${theme.dark.card || "hsl(222.2 84% 4.9%)"};
                --card-foreground: ${
                  theme.dark["card-foreground"] || "hsl(210 40% 98%)"
                };
                --popover: ${theme.dark.popover || "hsl(222.2 84% 4.9%)"};
                --popover-foreground: ${
                  theme.dark["popover-foreground"] || "hsl(210 40% 98%)"
                };
                --primary: ${theme.dark.primary || "hsl(210 40% 98%)"};
                --primary-foreground: ${
                  theme.dark["primary-foreground"] || "hsl(222.2 47.4% 11.2%)"
                };
                --secondary: ${
                  theme.dark.secondary || "hsl(217.2 32.6% 17.5%)"
                };
                --secondary-foreground: ${
                  theme.dark["secondary-foreground"] || "hsl(210 40% 98%)"
                };
                --muted: ${theme.dark.muted || "hsl(217.2 32.6% 17.5%)"};
                --muted-foreground: ${
                  theme.dark["muted-foreground"] || "hsl(215 20.2% 65.1%)"
                };
                --accent: ${theme.dark.accent || "hsl(217.2 32.6% 17.5%)"};
                --accent-foreground: ${
                  theme.dark["accent-foreground"] || "hsl(210 40% 98%)"
                };
                --destructive: ${
                  theme.dark.destructive || "hsl(0 62.8% 30.6%)"
                };
                --destructive-foreground: ${
                  theme.dark["destructive-foreground"] || "hsl(0 0% 100%)"
                };
                --border: ${theme.dark.border || "hsl(217.2 32.6% 17.5%)"};
                --input: ${theme.dark.input || "hsl(217.2 32.6% 17.5%)"};
                --ring: ${theme.dark.ring || "hsl(212.7 26.8% 83.9%)"};
                --sidebar: ${
                  theme.dark.sidebar || "hsl(222.2 84% 4.9%)"
                };
                --sidebar-foreground: ${
                  theme.dark["sidebar-foreground"] || "hsl(210 40% 98%)"
                };
                --sidebar-primary: ${
                  theme.dark["sidebar-primary"] || "hsl(210 40% 98%)"
                };
                --sidebar-primary-foreground: ${
                  theme.dark["sidebar-primary-foreground"] ||
                  "hsl(222.2 47.4% 11.2%)"
                };
                --sidebar-accent: ${
                  theme.dark["sidebar-accent"] || "hsl(217.2 32.6% 17.5%)"
                };
                --sidebar-accent-foreground: ${
                  theme.dark["sidebar-accent-foreground"] || "hsl(210 40% 98%)"
                };
                --sidebar-border: ${
                  theme.dark["sidebar-border"] || "hsl(217.2 32.6% 17.5%)"
                };
                --sidebar-ring: ${
                  theme.dark["sidebar-ring"] || "hsl(212.7 26.8% 83.9%)"
                };
              }
            `,
            }}
          />
        )}
      </head>
      <body className="bg-background flex flex-col h-screen overflow-hidden lg:min-h-screen lg:h-auto lg:overflow-auto" suppressHydrationWarning>
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
      </body>
    </html>
  );
}
