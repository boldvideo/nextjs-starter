"use client";

import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AskRelatedQuestionsProps {
  questions: string[];
  onQuestionClick: (question: string) => void;
}

export function AskRelatedQuestions({
  questions,
  onQuestionClick,
}: AskRelatedQuestionsProps) {
  if (questions.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
        Related Questions
      </h3>
      <div className="space-y-0 divide-y divide-border border-t border-b border-border">
        {questions.map((question, index) => (
          <button
            key={index}
            onClick={() => onQuestionClick(question)}
            className={cn(
              "w-full flex items-center gap-3 py-3 text-left",
              "text-sm text-foreground hover:text-primary transition-colors"
            )}
          >
            <ArrowDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span>{question}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
