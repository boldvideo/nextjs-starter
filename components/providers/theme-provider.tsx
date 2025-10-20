"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useEffect } from "react";
import { useTheme } from "next-themes";

function ThemeSetter({ forcedTheme }: { forcedTheme?: 'light' | 'dark' | 'system' | null }) {
  const { setTheme, theme } = useTheme();

  useEffect(() => {
    if (forcedTheme && theme !== forcedTheme) {
      setTheme(forcedTheme);
    }
  }, [forcedTheme, setTheme, theme]);

  return null;
}

export function ThemeProvider({ children, forcedTheme, ...props }: any) {
  return (
    <NextThemesProvider {...props}>
      <ThemeSetter forcedTheme={forcedTheme} />
      {children}
    </NextThemesProvider>
  );
}
