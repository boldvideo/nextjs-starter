"use client";

import { useSettings } from "@/components/providers/settings-provider";
import { getPortalConfig } from "@/lib/portal-config";
import { SearchBar } from "./search-bar";

interface HeaderSearchProps {
  className?: string;
}

export function HeaderSearch({ className }: HeaderSearchProps) {
  const settings = useSettings();
  const config = getPortalConfig(settings);

  // Don't render if search is disabled
  if (!config.navigation.showSearch) {
    return null;
  }

  return (
    <SearchBar
      className={className}
      showAiToggle={config.navigation.showAiToggle}
    />
  );
}
