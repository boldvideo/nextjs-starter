"use client";

import { useSettings } from "@/components/providers/settings-provider";
import { getPortalConfig } from "@/lib/portal-config";
import { SearchBar } from "./search-bar";
import { AskAiButton } from "./ask-ai-button";

interface HeaderSearchProps {
  className?: string;
}

export function HeaderSearch({ className }: HeaderSearchProps) {
  const settings = useSettings();
  const config = getPortalConfig(settings);

  if (!config.navigation.showSearch) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      {config.ai.showInHeader && (
        <AskAiButton personaName={config.ai.name} />
      )}
      <SearchBar className={className} />
    </div>
  );
}
