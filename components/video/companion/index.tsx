"use client";

import { useState, useEffect, type RefObject } from "react";
import { MessageSquare, List, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarToggle,
} from "@/components/ui/sidebar";
import { ChaptersSidebar } from "./chapters-sidebar";
import { AIAssistant } from "../chat";
import { Transcript } from "@/components/transcript";
import { useSidebar } from "@/components/providers/sidebar-provider";

interface VideoCompanionSidebarProps {
  // Props for content
  videoId: string;
  playbackId: string;
  chaptersWebVTT: string;
  aiName: string;
  aiAvatar: string;
  subdomain: string;
  userName?: string;
  greeting?: string;
  endpoint?: string;
  onChapterClick: (time: number) => void;
  hasChapters?: boolean;
  /** WEBVTT/JSON transcript URL — adds a Transcript tab when present */
  transcriptUrl?: string;
  playerRef?: RefObject<HTMLVideoElement | null>;

  // Visual props
  className?: string;
}

const TAB_STORAGE_KEY = "bold-video-companion-tab";
type CompanionTab = "chat" | "chapters" | "transcript";

export function VideoCompanionSidebar({
  videoId,
  playbackId,
  chaptersWebVTT,
  aiName,
  aiAvatar,
  subdomain,
  userName,
  greeting,
  endpoint,
  onChapterClick,
  className,
  hasChapters = true,
  transcriptUrl,
  playerRef,
}: VideoCompanionSidebarProps) {
  const { right, isMobile, setRightCollapsed, setRightOpen } =
    useSidebar();
  const [activeTab, setActiveTab] = useState<CompanionTab>("chat");
  const [isHydrated, setIsHydrated] = useState(false);
  const isCollapsed = right.isCollapsed && !isMobile;

  // Ensure right sidebar is "open" in context for desktop so width var is calculated correctly
  // even though we use mode="collapse" which technically makes it visible always
  useEffect(() => {
    if (!isMobile && !right.isOpen) {
      setRightOpen(true);
    }
  }, [isMobile, right.isOpen, setRightOpen]);

  // Hydrate tab state
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(TAB_STORAGE_KEY);
      if (
        stored === "chat" ||
        stored === "chapters" ||
        stored === "transcript"
      ) {
        setActiveTab(stored as CompanionTab);
      }
    } catch (e) {
      console.warn("Failed to hydrate tab state", e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Persist tab state
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(TAB_STORAGE_KEY, activeTab);
    } catch (e) {
      console.warn("Failed to save tab state", e);
    }
  }, [activeTab, isHydrated]);

  const tabs = [
    { id: "chat" as const, label: "Chat", icon: MessageSquare },
    { id: "chapters" as const, label: "Chapters", icon: List },
    ...(transcriptUrl
      ? [{ id: "transcript" as const, label: "Transcript", icon: FileText }]
      : []),
  ];

  return (
    <>
      <Sidebar side="right" mode="collapse" className={className}>
        <SidebarHeader className={isCollapsed ? "px-2 justify-center" : "p-0"}>
          {isCollapsed ? (
            <SidebarToggle side="right" mode="collapse" className="mt-2" />
          ) : (
            <div className="flex items-center w-full justify-between px-2">
              {/* Tab Navigation — HumanLayer app style: uppercase mono,
                  the active tab is a solid block, no icons, no underline */}
              <div className="flex items-center gap-1 py-2">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer",
                        isActive
                          ? "bg-[var(--bg-tertiary)] text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Mobile Close / Desktop Toggle */}
              <div className="flex-shrink-0">
                <SidebarToggle side="right" mode="collapse" />
              </div>
            </div>
          )}
        </SidebarHeader>

        <SidebarContent className="overflow-hidden flex flex-col h-full">
          {isCollapsed ? (
            <div className="flex flex-col gap-2 p-2 items-center mt-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setRightCollapsed(false);
                    }}
                    className={cn(
                      "p-2.5 rounded-md transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    title={tab.label}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              {activeTab === "chat" && (
                <div className="h-full flex flex-col min-h-0 pt-5">
                  <AIAssistant
                    videoId={videoId}
                    name={aiName}
                    avatar={aiAvatar}
                    subdomain={subdomain}
                    userName={userName}
                    greeting={greeting}
                    endpoint={endpoint}
                    isEmbedded={true}
                    className="h-full"
                  />
                </div>
              )}

              {activeTab === "chapters" && (
                <div className="h-full flex flex-col min-h-0">
                  {hasChapters ? (
                    <ChaptersSidebar
                      chaptersWebVTT={chaptersWebVTT}
                      playbackId={playbackId}
                      onChapterClick={onChapterClick}
                      className="border-none shadow-none rounded-none h-full max-h-none"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                      No chapters available
                    </div>
                  )}
                </div>
              )}

              {activeTab === "transcript" && transcriptUrl && playerRef && (
                <div className="h-full min-h-0 overflow-y-auto px-3 py-4">
                  <Transcript
                    url={transcriptUrl}
                    onCueClick={onChapterClick}
                    playerRef={playerRef}
                  />
                </div>
              )}
            </>
          )}
        </SidebarContent>
      </Sidebar>
    </>
  );
}
