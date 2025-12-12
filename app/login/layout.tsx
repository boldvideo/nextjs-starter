import type { Metadata } from "next";
import "../(default)/globals.css";
import { getTenantContext } from "@/lib/get-tenant-context";
import { getPortalConfig } from "@/lib/portal-config";
import {
  getThemeFromSettings,
  generateThemeCss,
} from "@/lib/theme-css";
import { getAllFontVariables, getFontVar } from "@/lib/fonts";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign In",
};

export default async function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getTenantContext();
  const settings = context?.settings || null;
  const config = getPortalConfig(settings);
  const theme = getThemeFromSettings(settings);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const themeAny = theme as any;
  const fontHeaderVar = getFontVar(themeAny?.font_header);
  const fontBodyVar = getFontVar(themeAny?.font_body);

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
      </head>
      <body className="bg-background" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme={config.theme.colorScheme === "toggle" ? "system" : config.theme.colorScheme}
          enableSystem={config.theme.colorScheme === "toggle"}
          disableTransitionOnChange
        >
          <SettingsProvider settings={settings}>
            {children}
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
