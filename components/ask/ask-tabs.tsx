"use client";

import { cn } from "@/lib/utils";
import { MessageSquare, Video, FileText } from "lucide-react";

export type TabId = "answer" | "videos" | "files";

interface AskTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  citationCount: number;
}

const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "answer", label: "Answer", icon: MessageSquare },
  { id: "videos", label: "Videos", icon: Video },
  { id: "files", label: "Files", icon: FileText },
];

export function AskTabs({ activeTab, onTabChange, citationCount }: AskTabsProps) {
  return (
    <div className="flex items-center gap-1 px-4 md:px-6 py-2 border-b border-border/50 bg-muted/30">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const count = tab.id === "videos" ? citationCount : null;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.label}</span>
            {count !== null && count > 0 && (
              <span
                className={cn(
                  "ml-1 px-1.5 py-0.5 text-xs rounded-full",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
