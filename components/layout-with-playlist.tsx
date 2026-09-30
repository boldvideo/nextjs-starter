"use client";

import { ReactNode } from "react";
import { GymBar } from "@/components/gym/gym-bar";
import { GymFounderNote } from "@/components/gym/gym-founder-note";
import { GymArcade } from "@/components/gym/gym-arcade";
import { SearchCommandDialog } from "@/components/search-command-dialog";
import { PlaylistProvider } from "@/components/providers/playlist-provider";
import { BreadcrumbProvider } from "@/components/providers/breadcrumb-provider";
import type { Settings } from "@boldvideo/bold-js";

interface LayoutWithPlaylistProps {
  children: ReactNode;
  settings: Settings | null;
  showHeader?: boolean;
}

// Fork: the game bar replaces the tenant header on every page; the arcade
// layer (Konami code, achievements, sound) rides along everywhere.
function LayoutContent({ children }: LayoutWithPlaylistProps) {
  return (
    <>
      <GymBar />
      <GymFounderNote />
      <GymArcade />
      <SearchCommandDialog />
      <main className="flex-1 relative flex flex-col min-h-0 overflow-hidden pt-[var(--header-height)]">{children}</main>
    </>
  );
}

export function LayoutWithPlaylist({ children, settings, showHeader = true }: LayoutWithPlaylistProps) {
  return (
    <PlaylistProvider>
      <BreadcrumbProvider>
        <LayoutContent settings={settings} showHeader={showHeader}>
          {children}
        </LayoutContent>
      </BreadcrumbProvider>
    </PlaylistProvider>
  );
}
