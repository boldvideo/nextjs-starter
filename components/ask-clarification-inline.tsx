"use client";

import { useState, useEffect, useRef } from "react";
import { ClarificationResponse } from "@/lib/ask";
import { ArrowUp } from "lucide-react";

interface AskClarificationInlineProps {
  response: ClarificationResponse;
  onSubmit: (clarification: string, conversationId: string) => void;
  isLoading?: boolean;
}

export function AskClarificationInline({ 
  response, 
  onSubmit,
  isLoading = false 
}: AskClarificationInlineProps) {
  const [answer, setAnswer] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Focus textarea after mount
  useEffect(() => {
    if (textareaRef.current && !hasSubmitted) {
      textareaRef.current.focus();
    }
  }, [hasSubmitted]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (hasSubmitted || isLoading || !answer.trim()) {
      return;
    }
    
    setHasSubmitted(true);
    onSubmit(answer.trim(), response.conversation_id);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-foreground mb-3">
          I need a bit more context. Could you provide more details?
        </p>
        
        {response.clarifying_questions.length > 0 && (
          <div className="space-y-2 mb-4">
            {response.clarifying_questions.map((question, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span className="text-sm">{question}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          ref={textareaRef}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (answer.trim() && !hasSubmitted && !isLoading) {
                handleSubmit(e as any);
              }
            }
          }}
          placeholder="Type your response..."
          className="w-full p-3 rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          rows={3}
          disabled={isLoading || hasSubmitted}
        />

        <button
          type="submit"
          disabled={!answer.trim() || isLoading || hasSubmitted}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <span>Send</span>
              <ArrowUp className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}