"use client";

import { ReactNode } from "react";
import { GymBar } from "@/components/gym/gym-bar";
import { SearchCommandDialog } from "@/components/search-command-dialog";
import { PlaylistProvider } from "@/components/providers/playlist-provider";
import { BreadcrumbProvider } from "@/components/providers/breadcrumb-provider";
import type { Session } from "next-auth";
import type { Settings } from "@boldvideo/bold-js";

interface LayoutWithPlaylistProps {
  children: ReactNode;
  settings: Settings | null;
  session: Session | null;
  showHeader?: boolean;
}

// Fork: the gym bar replaces the tenant header on every page.
function LayoutContent({ children }: LayoutWithPlaylistProps) {
  return (
    <>
      <GymBar />
      <SearchCommandDialog />
      <main className="flex-1 relative flex flex-col min-h-0 overflow-hidden pt-[var(--header-height)]">{children}</main>
    </>
  );
}

export function LayoutWithPlaylist({ children, settings, session, showHeader = true }: LayoutWithPlaylistProps) {
  return (
    <PlaylistProvider>
      <BreadcrumbProvider>
        <LayoutContent settings={settings} session={session} showHeader={showHeader}>
          {children}
        </LayoutContent>
      </BreadcrumbProvider>
    </PlaylistProvider>
  );
}
