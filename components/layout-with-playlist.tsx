"use client";

import { ReactNode } from "react";
import { Header } from "@/components/header";
import { SearchCommandDialog } from "@/components/search-command-dialog";
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
          logo={settings?.logoUrl || "/bold-logo.svg"}
          logoDark={settings?.logoDarkUrl}
          menuItems={settings?.menuItems || []}
          session={session}
        />
      )}
      <SearchCommandDialog />
      <main className="flex-1 relative flex flex-col min-h-0 overflow-hidden pt-[var(--header-height)]">{children}</main>
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
