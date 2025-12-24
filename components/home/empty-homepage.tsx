import React from "react";
import { PortalSettings } from "@/lib/portal-config";

interface EmptyHomepageProps {
  settings: PortalSettings | null;
}

export function EmptyHomepage({ settings }: EmptyHomepageProps) {
  const accountName = settings?.account?.name || settings?.metaData?.channelName || "";

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <h1 className="text-2xl md:text-3xl font-medium text-muted-foreground/60">
        {accountName}
      </h1>
    </div>
  );
}