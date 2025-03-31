import { bold } from "@/client";
import "./globals.css";

export const metadata = {
  title: "Bold Demo Site",
  description: "Generated by bold.video",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let theme;

  try {
    const { data: settings } = await bold.settings();
    theme = settings.theme_config;
  } catch (error) {
    console.error("Failed to fetch settings:", error);
  }

  return (
    <html lang="en">
      <head>
        {theme && (
          <style
            dangerouslySetInnerHTML={{
              __html: `
              :root {
                --radius: ${theme.radius};
                
                --background: ${theme.light.background};
                --foreground: ${theme.light.foreground};
                --card: ${theme.light.card};
                --popover: ${theme.light.popover};
                --card-foreground: ${theme.light.card_foreground};
                --popover-foreground: ${theme.light.popover_foreground};
                --primary: ${theme.light.primary};
                --primary-foreground: ${theme.light.primary_foreground};
                --secondary: ${theme.light.secondary};
                --secondary-foreground: ${theme.light.secondary_foreground};
                --muted: ${theme.light.muted};
                --muted-foreground: ${theme.light.muted_foreground};
                --accent: ${theme.light.accent};
                --accent-foreground: ${theme.light.accent_foreground};
                --destructive: ${theme.light.destructive};
                --border: ${theme.light.border};
                --input: ${theme.light.input};
                --ring: ${theme.light.ring};
                --sidebar: ${theme.light.sidebar};
                --sidebar-foreground: ${theme.light.sidebar_foreground};
                --sidebar-primary: ${theme.light.sidebar_primary};
                --sidebar-primary-foreground: ${theme.light.sidebar_primary_foreground};
                --sidebar-accent: ${theme.light.sidebar_accent};
                --sidebar-accent-foreground: ${theme.light.sidebar_accent_foreground};
                --sidebar-border: ${theme.light.sidebar_border};
                --sidebar-ring: ${theme.light.sidebar_ring};
              }
              
              .dark {
                --background: ${theme.dark.background};
                --foreground: ${theme.dark.foreground};
                --card: ${theme.dark.card};
                --card-foreground: ${theme.dark.card_foreground};
                --popover: ${theme.dark.popover};
                --popover-foreground: ${theme.dark.popover_foreground};
                --primary: ${theme.dark.primary};
                --primary-foreground: ${theme.dark.primary_foreground};
                --secondary: ${theme.dark.secondary};
                --secondary-foreground: ${theme.dark.secondary_foreground};
                --muted: ${theme.dark.muted};
                --muted-foreground: ${theme.dark.muted_foreground};
                --accent: ${theme.dark.accent};
                --accent-foreground: ${theme.dark.accent_foreground};
                --destructive: ${theme.dark.destructive};
                --border: ${theme.dark.border};
                --input: ${theme.dark.input};
                --ring: ${theme.dark.ring};
                --sidebar: ${theme.dark.sidebar};
                --sidebar-foreground: ${theme.dark.sidebar_foreground};
                --sidebar-primary: ${theme.dark.sidebar_primary};
                --sidebar-primary-foreground: ${theme.dark.sidebar_primary_foreground};
                --sidebar-accent: ${theme.dark.sidebar_accent};
                --sidebar-accent-foreground: ${theme.dark.sidebar_accent_foreground};
                --sidebar-border: ${theme.dark.sidebar_border};
                --sidebar-ring: ${theme.dark.sidebar_ring};
              }
            `,
            }}
          />
        )}
      </head>
      <body className="bg-background text-foreground">{children}</body>
    </html>
  );
}
