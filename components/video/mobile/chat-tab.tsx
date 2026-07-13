"use client";

import { useEffect } from "react";
import { AIAssistant } from "../chat";
import { useAIAssistantContext } from "../chat/context";
import { ExtendedVideo } from "@/types/video-detail";
import { Settings } from "@boldvideo/bold-js";
import { getPortalConfig } from "@/lib/portal-config";

interface ChatTabProps {
  video: ExtendedVideo;
  settings: Settings | null;
  compact?: boolean;
}

export default function ChatTab({ video, settings, compact = true }: ChatTabProps) {
  const { setHasUnreadMessage, hasUnreadMessage } = useAIAssistantContext();
  // Single source of truth for AI name/avatar/greeting (account.ai settings)
  const aiConfig = getPortalConfig(settings).ai;

  // Clear unread badge when user views chat tab
  useEffect(() => {
     setHasUnreadMessage(false);
  }, [setHasUnreadMessage]);
  
  // Also clear if a new message arrives while we are looking at it
  useEffect(() => {
    if (hasUnreadMessage) {
      setHasUnreadMessage(false);
    }
  }, [hasUnreadMessage, setHasUnreadMessage]);

  return (
    <div className="h-full flex flex-col flex-1 min-h-0">
      <AIAssistant
        videoId={video.id}
        name={aiConfig.name}
        avatar={aiConfig.avatar || "/default-avatar.png"}
        subdomain={""}
        userName={undefined}
        greeting={aiConfig.greeting}
        isEmbedded={true}
        compact={compact}
        className="flex-1 h-full border-none shadow-none"
      />
    </div>
  );
}
