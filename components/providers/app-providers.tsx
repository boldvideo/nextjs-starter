"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { ProgressProvider } from "@/components/providers/progress-provider";
import { SidebarProvider } from "@/components/providers/sidebar-provider";
import { SearchProvider } from "@/components/providers/search-provider";
import type { Session } from "next-auth";
import type { Settings } from "@boldvideo/bold-js";

interface AppProvidersProps {
  children: React.ReactNode;
  session: Session | null;
  settings: Settings | null;
  themeConfig: {
    forcedTheme?: string | null;
    showToggle?: boolean;
  };
}

export function AppProviders({
  children,
  session,
  settings,
  themeConfig,
}: AppProvidersProps) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider
        attribute="class"
        // Boundary light is the canonical look; dark stays one toggle away.
        // Fresh storage key so visitors from the forced-dark era see the new
        // default once — their toggles persist from there.
        defaultTheme={themeConfig.forcedTheme || "light"}
        enableSystem={false}
        storageKey="aitw-theme"
        {...(themeConfig.forcedTheme && { forcedTheme: themeConfig.forcedTheme })}
      >
        <SettingsProvider settings={settings}>
          <ProgressProvider>
            <SidebarProvider>
              <SearchProvider>
                {children}
              </SearchProvider>
            </SidebarProvider>
          </ProgressProvider>
        </SettingsProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
