"use client";

import { ReactNode } from "react";
import { Header } from "@/components/header";
import { PlaylistProvider } from "@/components/providers/playlist-provider";
import type { Session } from "next-auth";
import type { Settings } from "@boldvideo/bold-js";

interface LayoutWithPlaylistProps {
  children: ReactNode;
  settings: Settings | null;
  session: Session | null;
  showHeader?: boolean;
}

function LayoutContent({ children, settings, session, showHeader = true }: LayoutWithPlaylistProps) {
  return (
    <>
      {showHeader && (
        <Header
          logo={settings?.logo_url || "/bold-logo.svg"}
          logoDark={settings?.logo_dark_url}
          menuItems={settings?.menu_items || []}
          session={session}
          className="h-18"
        />
      )}
      <main className="flex-1 relative h-full overflow-y-scroll flex">{children}</main>
    </>
  );
}

export function LayoutWithPlaylist({ children, settings, session, showHeader = true }: LayoutWithPlaylistProps) {
  return (
    <PlaylistProvider>
      <LayoutContent settings={settings} session={session} showHeader={showHeader}>
        {children}
      </LayoutContent>
    </PlaylistProvider>
  );
}
