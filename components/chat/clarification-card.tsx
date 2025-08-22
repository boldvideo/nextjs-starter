"use client";

import React from "react";
import Image from "next/image";
import { ClarificationResponse } from "@/lib/ask";
import { HelpCircle, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClarificationCardProps {
  response: ClarificationResponse;
  onSubmit?: (answer: string, conversationId: string) => void;
  disabled?: boolean;
  aiName?: string;
  aiAvatar?: string;
}

export function ClarificationCard({
  response,
  onSubmit,
  disabled = false,
  aiName = "AI",
  aiAvatar = "/placeholder-avatar.png"
}: ClarificationCardProps) {
  // Store conversation ID in a way that the parent can access it
  React.useEffect(() => {
    // The parent will handle the submission through the main input
    if (onSubmit && response.conversation_id) {
      // Store the conversation ID so the parent knows we're in clarification mode
      window.__clarificationConversationId = response.conversation_id;
    }
    return () => {
      delete window.__clarificationConversationId;
    };
  }, [response.conversation_id, onSubmit]);

  return (
    <div className="flex gap-3 w-full">
      {/* Avatar */}
      <div className="flex-shrink-0">
        <Image
          src={aiAvatar}
          alt={aiName}
          width={32}
          height={32}
          className="rounded-full"
        />
      </div>

      {/* Card Content - Always full width */}
      <div className="flex-1">
        <span className="text-xs text-muted-foreground ml-3">{aiName}</span>
        
        <div className="mt-1 space-y-3">
          {/* Simple intro text */}
          <p className="text-base">
            I need a bit more context to give you the best answer. Could you help me understand:
          </p>

          {/* Clarifying Questions */}
          {response.clarifying_questions.length > 0 && (
            <div className="space-y-2.5 mt-3">
              {response.clarifying_questions.map((question, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <MessageCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-base text-foreground">
                    {question}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}