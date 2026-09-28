import React from "react";
import type { Video } from "@boldvideo/bold-js";
import { getTenantContext } from "@/lib/get-tenant-context";
import { getPortalConfig } from "@/lib/portal-config";
import { GymHomepage } from "@/components/gym/gym-homepage";

// How often this page should revalidate (in seconds)
export const revalidate = 60;

/**
 * Fork: the homepage is always the gym's ask surface. Videos are fetched
 * only for the tape stats and the floor ticker.
 */
export default async function Home(): Promise<React.JSX.Element> {
  const context = await getTenantContext();
  if (!context) {
    throw new Error("Tenant not found");
  }

  const { client, settings } = context;
  const config = getPortalConfig(settings);

  let videos: Video[] = [];
  try {
    // The /videos index returns the full library; /videos/latest caps at 50
    const res = await client.videos.list({ page: 1 });
    videos = res?.data ?? [];
  } catch (error) {
    console.error("[gym] video list failed", error);
  }

  return <GymHomepage videos={videos} disclaimer={config.ai.chatDisclaimer} />;
}
