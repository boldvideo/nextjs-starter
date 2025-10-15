"use client";

import { ReactNode } from "react";
import { Header } from "@/components/header";
import { PlaylistProvider, usePlaylist } from "@/components/providers/playlist-provider";
import type { Session } from "next-auth";
import type { Settings } from "@boldvideo/bold-js";

interface LayoutWithPlaylistProps {
  children: ReactNode;
  settings: Settings | null;
  session: Session | null;
}

function LayoutContent({ children, settings, session }: LayoutWithPlaylistProps) {
  const { toggle, hasPlaylist } = usePlaylist();

  return (
    <>
      <Header
        logo={settings?.logo_url || "/bold-logo.svg"}
        logoDark={settings?.logo_dark_url}
        menuItems={settings?.menu_items || []}
        session={session}
        onPlaylistToggle={hasPlaylist ? toggle : undefined}
        className="h-18"
      />
      <main className="flex-1 h-full overflow-y-scroll flex">{children}</main>
    </>
  );
}

export function LayoutWithPlaylist({ children, settings, session }: LayoutWithPlaylistProps) {
  return (
    <PlaylistProvider>
      <LayoutContent settings={settings} session={session}>
        {children}
      </LayoutContent>
    </PlaylistProvider>
  );
}
