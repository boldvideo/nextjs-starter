"use client";

import { useState, useEffect } from "react";
import { MessageSquare, List } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarToggle,
} from "@/components/ui/sidebar";
import { ChaptersSidebar } from "./chapters-sidebar";
import { AIAssistant } from "./ui/ai-assistant";
import { useSidebar } from "@/components/providers/sidebar-provider";

export type VideoTabId = "chat" | "chapters" | "description" | "transcript" | "ai";

interface VideoContentTabsProps {
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
  
  // Visual props
  className?: string;
  
  // Legacy props support (to be ignored or adapted)
  activeTab?: VideoTabId;
  onTabChange?: (tab: VideoTabId) => void;
  hasTranscript?: boolean;
  hasChapters?: boolean;
  showAI?: boolean;
}

const TAB_STORAGE_KEY = "bold-video-content-tab";
type SidebarTab = "chat" | "chapters";

export function VideoContentTabs({
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
}: VideoContentTabsProps) {
  const { right } = useSidebar();
  const [activeTab, setActiveTab] = useState<SidebarTab>("chat");
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate tab state
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(TAB_STORAGE_KEY);
      if (stored === "chat" || stored === "chapters") {
        setActiveTab(stored);
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
  ];

  return (
    <Sidebar side="right" mode="toggle" className={className}>
      <SidebarHeader>
        <div className="flex items-center w-full gap-2">
          {/* Tab Navigation */}
          <div className="flex-1 flex gap-1 bg-muted/50 rounded-lg p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md",
                    "text-xs font-medium transition-all duration-200 cursor-pointer",
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile Close / Desktop Toggle */}
          <div className="flex-shrink-0">
            <SidebarToggle side="right" mode="toggle" />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {activeTab === "chat" && (
          <div className="h-full">
            <AIAssistant
              videoId={videoId}
              name={aiName}
              avatar={aiAvatar}
              subdomain={subdomain}
              userName={userName}
              greeting={greeting}
              endpoint={endpoint}
              isEmbedded={true}
            />
          </div>
        )}

        {activeTab === "chapters" && (
          <div className="h-full">
             {hasChapters ? (
              <ChaptersSidebar
                chaptersWebVTT={chaptersWebVTT}
                playbackId={playbackId}
                onChapterClick={onChapterClick}
                className="border-none shadow-none rounded-none"
              />
             ) : (
               <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                 No chapters available
               </div>
             )}
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
