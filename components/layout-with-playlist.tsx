"use client";

import { ReactNode } from "react";
import { Header } from "@/components/header";
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

function LayoutContent({ children }: LayoutWithPlaylistProps) {
  return (
    <>
      {/* One fixed nav; the panel below starts at its measured height */}
      <Header />
      <SearchCommandDialog />
      {/* The startups.com "app in a card" chrome: everything lives inside
          a rounded, hairline-bordered panel inset on the frame color */}
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-2 pt-[var(--site-bar-height)] sm:px-3 sm:pb-3">
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-background">
          {children}
        </div>
      </main>
    </>
  );
}

export function LayoutWithPlaylist({
  children,
  settings,
  session,
  showHeader = true,
}: LayoutWithPlaylistProps) {
  return (
    <PlaylistProvider>
      <BreadcrumbProvider>
        <LayoutContent
          settings={settings}
          session={session}
          showHeader={showHeader}
        >
          {children}
        </LayoutContent>
      </BreadcrumbProvider>
    </PlaylistProvider>
  );
}
