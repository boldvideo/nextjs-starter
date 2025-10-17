"use client";

import { useState, useEffect, useRef } from "react";
import { ClarificationResponse } from "@/lib/ask";
import { ArrowUp, Sparkles } from "lucide-react";

interface AskClarificationProps {
  response: ClarificationResponse;
  onSubmit: (clarification: string, conversationId: string) => void;
  isLoading?: boolean;
}

export function AskClarification({ 
  response, 
  onSubmit,
  isLoading = false 
}: AskClarificationProps) {
  const [answer, setAnswer] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Focus textarea after mount to avoid autoFocus issues
  useEffect(() => {
    if (textareaRef.current && !hasSubmitted) {
      textareaRef.current.focus();
    }
  }, [hasSubmitted]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent double submission
    if (hasSubmitted || isLoading || !answer.trim()) {
      console.log("[AskClarification] Prevented submit - hasSubmitted:", hasSubmitted, "isLoading:", isLoading, "answer:", answer);
      return;
    }
    
    console.log("[AskClarification] Submitting clarification:", answer);
    setHasSubmitted(true);
    onSubmit(answer.trim(), response.conversation_id);
  };

  return (
    <div className="space-y-6">
      {/* Original Query Display */}
      <div className="bg-sidebar p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 mt-0.5 text-primary flex-shrink-0" />
          <div>
            <p className="text-sm text-muted-foreground mb-1">Your question</p>
            <p className="text-base font-medium">{response.original_query}</p>
          </div>
        </div>
      </div>

      {/* Clarification Request */}
      <div className="bg-background border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3">I need a bit more context</h3>
        
        <p className="text-muted-foreground mb-4">
          To give you the most relevant answer, could you provide more details?
        </p>

        {/* Clarifying Questions */}
        {response.clarifying_questions.length > 0 && (
          <div className="space-y-2 mb-6">
            {response.clarifying_questions.map((question, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span className="text-sm">{question}</span>
              </div>
            ))}
          </div>
        )}

        {/* Answer Input */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            ref={textareaRef}
            value={answer}
            onChange={(e) => {
              console.log("[AskClarification] Text changed:", e.target.value);
              setAnswer(e.target.value);
            }}
            onKeyDown={(e) => {
              // Prevent Enter from submitting form (allow Shift+Enter for new lines)
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (answer.trim() && !hasSubmitted && !isLoading) {
                  handleSubmit(e as any);
                }
              }
            }}
            placeholder="Provide more context here..."
            className="w-full p-4 rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            rows={4}
            disabled={isLoading || hasSubmitted}
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!answer.trim() || isLoading || hasSubmitted}
            className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <ArrowUp className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}