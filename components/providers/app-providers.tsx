"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { ProgressProvider } from "@/components/providers/progress-provider";
import { SidebarProvider } from "@/components/providers/sidebar-provider";
import type { Session } from "next-auth";
import type { Settings } from "@boldvideo/bold-js";

interface AppProvidersProps {
  children: React.ReactNode;
  session: Session | null;
  settings: Settings | null;
  themeConfig: {
    forcedTheme?: string;
    [key: string]: any;
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
        defaultTheme={themeConfig.forcedTheme || "dark"}
        enableSystem={!themeConfig.forcedTheme}
        {...(themeConfig.forcedTheme && { forcedTheme: themeConfig.forcedTheme })}
      >
        <SettingsProvider settings={settings}>
          <ProgressProvider>
            <SidebarProvider>
              {children}
            </SidebarProvider>
          </ProgressProvider>
        </SettingsProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
