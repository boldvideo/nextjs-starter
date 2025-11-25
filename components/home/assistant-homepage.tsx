"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChatInput } from "@/components/coach";
import { PortalSettings, PortalConfig } from "@/lib/portal-config";

interface AssistantHomepageProps {
  settings: PortalSettings | null;
  config: PortalConfig;
}

export function AssistantHomepage({ settings, config }: AssistantHomepageProps) {
  const [query, setQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmedQuery = query.trim();
      
      if (!trimmedQuery || isSubmitting) return;
      
      setIsSubmitting(true);

      // Navigate to coach page with query parameter (using 'c' to avoid conflict with global search 'q')
      router.push(`/coach?c=${encodeURIComponent(trimmedQuery)}`);
    },
    [query, isSubmitting, router]
  );

  // Use AI name as headline, or custom headline if provided
  const aiName = config.ai.name;
  const headline = config.homepage.assistantConfig?.headline || 
                   `Ask ${aiName}`;
  const subheadline = config.homepage.assistantConfig?.subheadline || 
                      config.ai.greeting || "I can help with...";
  const suggestions = config.homepage.assistantConfig?.suggestions || [
    "How can I improve my product?",
    "What are best practices for scaling?",
    "How do I manage my team better?"
  ];

  return (
    <div className="flex h-[calc(100vh-120px)] w-full items-center justify-center px-6">
      <div className="w-full max-w-2xl space-y-8">
        {/* Centered Content with Avatar, Headline, and Input */}
        <div className="text-center space-y-4">
          {/* AI Avatar */}
          {config.ai.avatar && (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full overflow-hidden bg-primary/10">
              <Image 
                src={config.ai.avatar} 
                alt={aiName}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            {headline}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            {subheadline}
          </p>
        </div>

        {/* Input Area - Part of the centered content */}
        <div className="w-full">
          <ChatInput
            value={query}
            onChange={setQuery}
            onSubmit={handleSubmit}
            placeholder="Need clarity, connection, or calm? Just ask."
            disabled={isSubmitting}
            isStreaming={false}
            autoFocus={true}
            suggestions={suggestions}
            showSuggestions={true}
          />
        </div>
      </div>
    </div>
  );
}