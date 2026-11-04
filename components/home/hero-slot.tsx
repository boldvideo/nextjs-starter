"use client";

import dynamic from "next/dynamic";
import type { PortalSettings, PortalConfig } from "@/lib/portal-config";

export interface HeroProps {
  settings: PortalSettings | null;
  /** Tenant editorial content (Sanity) fetched on the server, if any */
  content?: unknown;
}

const heroes: Record<string, React.ComponentType<HeroProps>> = {
  yo: dynamic(() => import("./heroes/yo-hero")),
  asmartbear: dynamic(() => import("./heroes/asmartbear-hero")),
};

interface HeroSlotProps {
  settings: PortalSettings | null;
  config: PortalConfig;
  content?: unknown;
}

export function HeroSlot({ settings, config, content }: HeroSlotProps) {
  if (!config.hero.enabled || config.hero.type !== "custom") {
    return null;
  }

  const slug = settings?.account?.slug;
  if (!slug) return null;

  const HeroComponent = heroes[slug];
  if (!HeroComponent) return null;

  return <HeroComponent settings={settings} content={content} />;
}
