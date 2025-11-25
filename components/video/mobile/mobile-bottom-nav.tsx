"use client";

import { Info, List, MessageSquare, PlaySquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAIAssistantContext } from "@/components/video/chat/context";
import { MobileTab } from "./mobile-content-shell";

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  hasPlaylist: boolean;
  className?: string;
}

export default function MobileBottomNav({
  activeTab,
  onTabChange,
  hasPlaylist,
  className,
}: MobileBottomNavProps) {
  const { hasUnreadMessage } = useAIAssistantContext();

  const tabs = [
    ...(hasPlaylist
      ? [{ id: "playlist" as const, label: "Playlist", icon: PlaySquare }]
      : []),
    { id: "info" as const, label: "Info", icon: Info },
    { id: "chapters" as const, label: "Chapters", icon: List },
    { id: "chat" as const, label: "Chat", icon: MessageSquare },
  ];

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-30 bg-background border-t border-border pb-safe",
        className
      )}
    >
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 px-4 min-w-0 flex-1 transition-colors relative",
                "touch-manipulation", // iOS tap optimization
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              )}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Badge indicator for Chat tab */}
              {tab.id === "chat" && hasUnreadMessage && !isActive && (
                <span className="absolute top-2 right-1/3 h-2 w-2 bg-red-500 rounded-full ring-2 ring-background" />
              )}

              <Icon className="h-6 w-6 flex-shrink-0" />
              <span className="text-xs font-medium truncate w-full text-center">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
