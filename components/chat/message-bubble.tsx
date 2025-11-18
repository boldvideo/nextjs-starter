"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatMessage } from "@/hooks/use-ask-stream";
import { cn } from "@/lib/utils";
import { User, AlertCircle } from "lucide-react";

const LOADING_MESSAGES = [
  "Analyzing your question",
  "Searching through content",
  "Finding the best answer",
  "Synthesizing information",
  "Preparing response"
];

interface MessageBubbleProps {
  message: ChatMessage;
  aiName?: string;
  aiAvatar?: string;
  isStreaming?: boolean;
}

export function MessageBubble({ 
  message, 
  aiName = "AI",
  aiAvatar = "/placeholder-avatar.png",
  isStreaming = false
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isError = message.type === "error";
  const isLoading = message.type === "loading";
  
  // Cycle through loading messages
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  
  useEffect(() => {
    if (!isLoading) return;
    
    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [isLoading]);

  return (
    <div className={cn(
      "flex gap-3 w-full",
      isUser ? "justify-end" : "justify-start"
    )}>
      {/* Avatar for AI (left side) */}
      {!isUser && (
        <div className="flex-shrink-0">
          <Image
            src={aiAvatar}
            alt={aiName}
            width={32}
            height={32}
            className="rounded-full"
          />
        </div>
      )}

      {/* Message Content */}
      <div className={cn(
        "flex flex-col gap-1",
        isUser ? "max-w-[70%]" : "flex-1",
        isUser && "items-end"
      )}>
        {/* Name label */}
        {!isUser && (
          <span className="text-xs text-muted-foreground ml-3">
            {aiName}
          </span>
        )}

        {/* Message bubble */}
        <div className={cn(
          "transition-all",
          isUser ? [
            "rounded-2xl px-4 py-2.5",
            "bg-primary/10 text-foreground",
            "rounded-tr-sm",
            "max-w-full"
          ] : [
            isError ? "rounded-2xl px-4 py-2.5 bg-destructive/10 text-destructive border border-destructive/20" :
            "" // No background for AI messages including loading
          ]
        )}>
          {isLoading ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                </span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75 [animation-delay:0.2s]"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                </span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75 [animation-delay:0.4s]"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                </span>
              </div>
              <span className="text-sm text-foreground animate-pulse">
                {LOADING_MESSAGES[loadingMessageIndex]}
              </span>
            </div>
          ) : isError ? (
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="text-sm">{message.content}</div>
            </div>
          ) : (
            <div className={cn(
              "break-words prose max-w-none dark:prose-invert prose-p:my-2 prose-headings:mt-3 prose-headings:mb-2 prose-strong:font-semibold prose-li:my-1",
              isUser ? "prose-base" : "prose-lg"
            )}>
              {typeof message.content === "string" ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ ...props }) => (
                      <a
                        {...props}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      />
                    ),
                    ul: ({ ...props }) => (
                      <ul {...props} className="list-disc pl-5 space-y-1" />
                    ),
                    ol: ({ ...props }) => (
                      <ol {...props} className="list-decimal pl-5 space-y-1" />
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              ) : (
                message.content
              )}
            </div>
          )}

          {/* Streaming indicator */}
          {isStreaming && !isLoading && !isUser && (
            <span className="inline-block w-1 h-4 bg-current animate-pulse ml-0.5" />
          )}
        </div>
      </div>

      {/* Avatar for User (right side) */}
      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center">
            <User className="w-5 h-5 text-background" />
          </div>
        </div>
      )}
    </div>
  );
}