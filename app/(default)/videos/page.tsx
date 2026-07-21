import React from "react";
import type { Video } from "@boldvideo/bold-js";
import { getTenantContext } from "@/lib/get-tenant-context";
import { SrlLibrary } from "@/components/home/srl-library";

export const revalidate = 60;

/**
 * The full episode library, one level below the chat-first homepage.
 */
export default async function VideosPage(): Promise<React.JSX.Element> {
  const context = await getTenantContext();
  if (!context) {
    throw new Error("Tenant not found");
  }

  const { client } = context;

  const videosResponse = await client.videos.list({ page: 1 });
  const videos: Video[] | null = videosResponse?.data ?? null;

  return <SrlLibrary videos={videos} />;
}
