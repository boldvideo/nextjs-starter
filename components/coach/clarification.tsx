"use client";

import React from "react";
import Image from "next/image";
import { ClarificationResponse } from "@/lib/ask";
import { MessageCircle } from "lucide-react";

interface ClarificationCardProps {
  response: ClarificationResponse;
  onSubmit?: (answer: string, conversationId: string) => void;
  disabled?: boolean;
  aiName?: string;
  aiAvatar?: string;
}

export function ClarificationCard({
  response,
  aiName = "AI",
  aiAvatar = "/placeholder-avatar.png"
}: ClarificationCardProps) {
  // The parent component handles clarification through the main input
  // No need to store conversation ID here

  return (
    <div className="flex gap-3 w-full">
      {/* Avatar */}
      <div className="flex-shrink-0">
        <Image
          src={aiAvatar}
          alt={aiName}
          width={36}
          height={36}
          className="rounded-full"
        />
      </div>

      {/* Card Content - Always full width */}
      <div className="flex-1">
        <span className="text-xs text-muted-foreground ml-3">{aiName}</span>
        
        <div className="mt-1 space-y-4">
          {/* Simple intro text */}
          <p className="text-lg leading-relaxed">
            I&apos;d love to help you with that. To give you the most relevant guidance, could you tell me:
          </p>

          {/* Clarifying Questions */}
          {response.clarifyingQuestions.length > 0 && (
            <div className="space-y-3 mt-4">
              {response.clarifyingQuestions.map((question, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <MessageCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-lg text-foreground leading-relaxed">
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