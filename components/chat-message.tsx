"use client";

import Image from "next/image";
import { User, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string | React.ReactNode;
  isLoading?: boolean;
  avatar?: string;
  name?: string;
}

export function ChatMessage({ 
  role, 
  content, 
  isLoading = false,
  avatar,
  name 
}: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={cn(
      "flex gap-3 py-6",
      isUser ? "bg-background" : "bg-sidebar/50"
    )}>
      <div className="w-full max-w-4xl mx-auto px-4 flex gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center relative">
              {avatar ? (
                <Image
                  src={avatar}
                  alt={name || "AI Assistant"}
                  fill
                  className="object-cover rounded-full"
                />
              ) : (
                <Sparkles className="w-4 h-4 text-primary" />
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name */}
          <div className="font-medium text-sm mb-1">
            {isUser ? "You" : (name || "AI Assistant")}
          </div>

          {/* Message */}
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          ) : (
            <div className="text-foreground">
              {typeof content === "string" ? (
                <div className="prose prose-neutral dark:prose-invert max-w-none">
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
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                </div>
              ) : (
                content
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}