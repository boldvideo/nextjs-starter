// providers/settings-provider.tsx
"use client";

import { createContext, useContext } from "react";
import type { Settings } from "@boldvideo/bold-js";

const SettingsContext = createContext<Settings | null>(null);

export function SettingsProvider({
  settings,
  children,
}: {
  settings: Settings | null;
  children: React.ReactNode;
}) {
  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
