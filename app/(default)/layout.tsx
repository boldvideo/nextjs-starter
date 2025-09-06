import type { Metadata } from "next";
import "./globals.css";

import { bold } from "@/client";
import type { Settings } from "@boldvideo/bold-js";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Header } from "@/components/header";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { getPortalConfig } from "@/lib/portal-config";

// Extend the Settings type to include additional properties
interface ExtendedSettings extends Settings {
  theme_config?: {
    radius: string;
    light: {
      background: string;
      foreground: string;
      card: string;
      popover: string;
      card_foreground: string;
      popover_foreground: string;
      primary: string;
      primary_foreground: string;
      secondary: string;
      secondary_foreground: string;
      muted: string;
      muted_foreground: string;
      accent: string;
      accent_foreground: string;
      destructive: string;
      border: string;
      input: string;
      ring: string;
      sidebar: string;
      sidebar_foreground: string;
      sidebar_primary: string;
      sidebar_primary_foreground: string;
      sidebar_accent: string;
      sidebar_accent_foreground: string;
      sidebar_border: string;
      sidebar_ring: string;
    };
    dark: {
      background: string;
      foreground: string;
      card: string;
      card_foreground: string;
      popover: string;
      popover_foreground: string;
      primary: string;
      primary_foreground: string;
      secondary: string;
      secondary_foreground: string;
      muted: string;
      muted_foreground: string;
      accent: string;
      accent_foreground: string;
      destructive: string;
      border: string;
      input: string;
      ring: string;
      sidebar: string;
      sidebar_foreground: string;
      sidebar_primary: string;
      sidebar_primary_foreground: string;
      sidebar_accent: string;
      sidebar_accent_foreground: string;
      sidebar_border: string;
      sidebar_ring: string;
    };
  };
  logo_url?: string;
  logo_dark_url?: string;
  favicon_url?: string;
  ai_greeting?: string;
  // Extend the nested meta_data object
  meta_data: Settings["meta_data"] & {
    social_graph_image_url?: string;
  };
}

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
  let settings = {} as ExtendedSettings;

  try {
    const settingsResponse = await bold.settings();
    settings = settingsResponse.data as ExtendedSettings;
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

  const meta = settings.meta_data;
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
      icon: settings.favicon_url || "/favicon.ico", // Use fetched url or default
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize with a type assertion that handles all required fields from the base Settings type
  // Settings are fetched here again for theme/layout purposes, separate from metadata generation.
  let settings = {} as ExtendedSettings;
  settings.menu_items = []; // Ensure menu_items is initialized

  try {
    const settingsResponse = await bold.settings();
    settings = settingsResponse.data as ExtendedSettings;
    // Ensure meta_data is initialized if it comes back null/undefined but expected
    if (!settings.meta_data) {
      settings.meta_data = {} as ExtendedSettings["meta_data"];
    }
  } catch (error) {
    console.error("Failed to fetch settings for layout:", error);
    // Initialize meta_data in case of error too
    settings.meta_data = {} as ExtendedSettings["meta_data"];
  }

  const theme = settings.theme_config;
  
  // Get portal configuration to determine if we should show header
  const config = getPortalConfig(settings);
  const showHeader = config.homepage.layout !== 'none';

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
                  theme.light.card_foreground || "hsl(222.2 84% 4.9%)"
                };
                --popover-foreground: ${
                  theme.light.popover_foreground || "hsl(222.2 84% 4.9%)"
                };
                --primary: ${theme.light.primary || "hsl(222.2 47.4% 11.2%)"};
                --primary-foreground: ${
                  theme.light.primary_foreground || "hsl(210 40% 98%)"
                };
                --secondary: ${theme.light.secondary || "hsl(210 40% 96.1%)"};
                --secondary-foreground: ${
                  theme.light.secondary_foreground || "hsl(222.2 47.4% 11.2%)"
                };
                --muted: ${theme.light.muted || "hsl(210 40% 96.1%)"};
                --muted-foreground: ${
                  theme.light.muted_foreground || "hsl(215.4 16.3% 46.9%)"
                };
                --accent: ${theme.light.accent || "hsl(210 40% 96.1%)"};
                --accent-foreground: ${
                  theme.light.accent_foreground || "hsl(222.2 47.4% 11.2%)"
                };
                --destructive: ${
                  theme.light.destructive || "hsl(0 84.2% 60.2%)"
                };
                --border: ${theme.light.border || "hsl(214.3 31.8% 91.4%)"};
                --input: ${theme.light.input || "hsl(214.3 31.8% 91.4%)"};
                --ring: ${theme.light.ring || "hsl(222.2 84% 4.9%)"};
                --sidebar: ${
                  theme.light.sidebar || "hsl(0 0% 100%)"
                }; /* Example fallback */
                --sidebar-foreground: ${
                  theme.light.sidebar_foreground || "hsl(222.2 84% 4.9%)"
                }; /* Example fallback */
                --sidebar-primary: ${
                  theme.light.sidebar_primary || "hsl(222.2 47.4% 11.2%)"
                }; /* Example fallback */
                --sidebar-primary-foreground: ${
                  theme.light.sidebar_primary_foreground || "hsl(210 40% 98%)"
                }; /* Example fallback */
                --sidebar-accent: ${
                  theme.light.sidebar_accent || "hsl(210 40% 96.1%)"
                }; /* Example fallback */
                --sidebar-accent-foreground: ${
                  theme.light.sidebar_accent_foreground ||
                  "hsl(222.2 47.4% 11.2%)"
                }; /* Example fallback */
                --sidebar-border: ${
                  theme.light.sidebar_border || "hsl(214.3 31.8% 91.4%)"
                }; /* Example fallback */
                --sidebar-ring: ${
                  theme.light.sidebar_ring || "hsl(222.2 84% 4.9%)"
                }; /* Example fallback */
              }

              .dark {
                 --background: ${
                   theme.dark.background || "hsl(222.2 84% 4.9%)"
                 };
                --foreground: ${theme.dark.foreground || "hsl(210 40% 98%)"};
                --card: ${theme.dark.card || "hsl(222.2 84% 4.9%)"};
                --card-foreground: ${
                  theme.dark.card_foreground || "hsl(210 40% 98%)"
                };
                --popover: ${theme.dark.popover || "hsl(222.2 84% 4.9%)"};
                --popover-foreground: ${
                  theme.dark.popover_foreground || "hsl(210 40% 98%)"
                };
                --primary: ${theme.dark.primary || "hsl(210 40% 98%)"};
                --primary-foreground: ${
                  theme.dark.primary_foreground || "hsl(222.2 47.4% 11.2%)"
                };
                --secondary: ${
                  theme.dark.secondary || "hsl(217.2 32.6% 17.5%)"
                };
                --secondary-foreground: ${
                  theme.dark.secondary_foreground || "hsl(210 40% 98%)"
                };
                --muted: ${theme.dark.muted || "hsl(217.2 32.6% 17.5%)"};
                --muted-foreground: ${
                  theme.dark.muted_foreground || "hsl(215 20.2% 65.1%)"
                };
                --accent: ${theme.dark.accent || "hsl(217.2 32.6% 17.5%)"};
                --accent-foreground: ${
                  theme.dark.accent_foreground || "hsl(210 40% 98%)"
                };
                --destructive: ${
                  theme.dark.destructive || "hsl(0 62.8% 30.6%)"
                };
                --border: ${theme.dark.border || "hsl(217.2 32.6% 17.5%)"};
                --input: ${theme.dark.input || "hsl(217.2 32.6% 17.5%)"};
                --ring: ${theme.dark.ring || "hsl(212.7 26.8% 83.9%)"};
                --sidebar: ${
                  theme.dark.sidebar || "hsl(222.2 84% 4.9%)"
                }; /* Example fallback */
                --sidebar-foreground: ${
                  theme.dark.sidebar_foreground || "hsl(210 40% 98%)"
                }; /* Example fallback */
                --sidebar-primary: ${
                  theme.dark.sidebar_primary || "hsl(210 40% 98%)"
                }; /* Example fallback */
                --sidebar-primary-foreground: ${
                  theme.dark.sidebar_primary_foreground ||
                  "hsl(222.2 47.4% 11.2%)"
                }; /* Example fallback */
                --sidebar-accent: ${
                  theme.dark.sidebar_accent || "hsl(217.2 32.6% 17.5%)"
                }; /* Example fallback */
                --sidebar-accent-foreground: ${
                  theme.dark.sidebar_accent_foreground || "hsl(210 40% 98%)"
                }; /* Example fallback */
                --sidebar-border: ${
                  theme.dark.sidebar_border || "hsl(217.2 32.6% 17.5%)"
                }; /* Example fallback */
                --sidebar-ring: ${
                  theme.dark.sidebar_ring || "hsl(212.7 26.8% 83.9%)"
                }; /* Example fallback */
              }
            `,
            }}
          />
        )}
      </head>
      <body className="bg-background flex flex-col h-screen lg:h-auto min-h-screen">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <SettingsProvider settings={settings}>
            {showHeader && (
              <Header
                logo={settings.logo_url || "/bold-logo.svg"}
                logoDark={settings.logo_dark_url}
                menuItems={settings.menu_items || []}
              />
            )}
            <main className="flex-1 min-h-0 flex flex-col items-center">
              {children}
            </main>
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
