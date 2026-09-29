"use client";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { ProgressProvider } from "@/components/providers/progress-provider";
import { SidebarProvider } from "@/components/providers/sidebar-provider";
import { SearchProvider } from "@/components/providers/search-provider";
import type { Settings } from "@boldvideo/bold-js";

interface AppProvidersProps {
  children: React.ReactNode;
  settings: Settings | null;
  themeConfig: {
    forcedTheme?: string | null;
    showToggle?: boolean;
  };
}

export function AppProviders({
  children,
  settings,
  themeConfig,
}: AppProvidersProps) {
  return (
      <ThemeProvider
        attribute="class"
        defaultTheme={themeConfig.forcedTheme || "dark"}
        enableSystem={!themeConfig.forcedTheme}
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
  );
}
