"use client";

import dynamic from "next/dynamic";
import type { PortalSettings, PortalConfig } from "@/lib/portal-config";

export interface HeroProps {
  settings: PortalSettings | null;
}

const heroes: Record<string, React.ComponentType<HeroProps>> = {
  yo: dynamic(() => import("./heroes/yo-hero")),
};

interface HeroSlotProps {
  settings: PortalSettings | null;
  config: PortalConfig;
}

export function HeroSlot({ settings, config }: HeroSlotProps) {
  if (!config.hero.enabled || config.hero.type !== "custom") {
    return null;
  }

  const slug = settings?.account?.slug;
  if (!slug) return null;

  const HeroComponent = heroes[slug];
  if (!HeroComponent) return null;

  return <HeroComponent settings={settings} />;
}
