"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SynthesizedResponse, AskCitation } from "@/lib/ask";
import { CitationModal } from "./citation";
import { ChevronDown, ChevronUp, PlayCircle, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnswerCardProps {
  response: SynthesizedResponse;
  aiName?: string;
  aiAvatar?: string;
}

export function AnswerCard({
  response,
  aiName = "AI",
  aiAvatar = "/placeholder-avatar.png"
}: AnswerCardProps) {
  const [selectedCitation, setSelectedCitation] = useState<AskCitation | null>(null);
  const [showRelatedQuestions, setShowRelatedQuestions] = useState(false);
  const { answer, expanded_queries } = response;

  // Create a map of citation numbers for sparse arrays
  const citationMap = React.useMemo(() => {
    if (!answer.citations) return new Map();
    
    // The API sends citations in order they appear in text
    // But the numbers in text might be sparse (e.g., [1], [7], [6])
    // We need to map based on order of appearance
    const map = new Map<number, AskCitation>();
    
    // Find all citation numbers in the text in order of appearance
    const citationMatches = Array.from(answer.text.matchAll(/\[(\d+)\]/g));
    const uniqueNumbers = Array.from(new Set(citationMatches.map(m => parseInt(m[1]))));
    
    console.log('[AnswerCard] Citation numbers in text:', uniqueNumbers);
    console.log('[AnswerCard] Citations from API:', answer.citations.length);
    
    // Map each unique citation number to its corresponding citation
    // Assuming citations are provided in the same order they appear
    uniqueNumbers.forEach((num, index) => {
      if (index < answer.citations.length) {
        map.set(num, answer.citations[index]);
        console.log(`[AnswerCard] Mapping [${num}] to citation:`, answer.citations[index].video_title);
      }
    });
    
    return map;
  }, [answer.text, answer.citations]);

  // Pre-process the markdown text to replace citations with placeholders
  const preprocessedText = React.useMemo(() => {
    if (!answer.text || !answer.citations) return answer.text;
    
    let processedText = answer.text;
    
    // Replace each citation number with a placeholder
    citationMap.forEach((citation, num) => {
      const pattern = new RegExp(`\\[${num}\\]`, 'g');
      processedText = processedText.replace(
        pattern,
        `@@CITATION_${num}_${citation.id}@@`
      );
    });
    
    return processedText;
  }, [answer.text, answer.citations, citationMap]);
  
  // Custom component to render citation placeholders
  const renderTextWithCitations = useCallback((text: string) => {
    if (!text || typeof text !== 'string') return text;
    
    // Pattern to match our citation placeholders
    const pattern = /@@CITATION_(\d+)_([^@]+)@@/g;
    const parts: (string | React.ReactNode)[] = [];
    let lastIndex = 0;
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
      // Add text before citation
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      const citationNum = parseInt(match[1]);
      const citationId = match[2];
      // Find citation by ID (more reliable than index)
      const citation = answer.citations?.find(c => c.id === citationId);
      
      if (citation) {
        // Format timestamp for display
        const formatTimestamp = (ms: number) => {
            if (!ms && ms !== 0) return "";
            const seconds = Math.floor(ms / 1000);
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}:${secs.toString().padStart(2, "0")}`;
        };
        
        const timestamp = formatTimestamp(citation.start_ms);
        
        parts.push(
          <button
            key={`cite-${citationId}-${match.index}`}
            onClick={() => setSelectedCitation(citation)}
            className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors mx-1"
            title={`Click to watch video segment`}
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span className="underline decoration-dotted underline-offset-2">
              {citation.video_title}
              {timestamp && <span className="text-muted-foreground ml-1">({timestamp})</span>}
            </span>
          </button>
        );
      } else {
        // Citation not found, show original number
        parts.push(`[${citationNum}]`);
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts.length > 1 ? <>{parts}</> : text;
  }, [answer.citations]);

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

      {/* Answer Content - Always full width */}
      <div className="flex-1">
        <span className="text-xs text-muted-foreground ml-3">{aiName}</span>
        
        <div className="mt-1 space-y-4">
          {/* Main Answer - No bubble, just text */}
          <div className={cn(
            "prose prose-lg max-w-none text-foreground",
            "dark:prose-invert", // This is the key - invert prose colors in dark mode
            "prose-p:my-4 prose-p:leading-relaxed prose-headings:mt-6 prose-headings:mb-3",
            "prose-strong:font-semibold prose-li:my-2"
          )}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children, ...props }) => {
                  const processedChildren = React.Children.map(children, (child) => {
                    if (typeof child === 'string') {
                      return renderTextWithCitations(child);
                    }
                    return child;
                  });
                  return <p {...props}>{processedChildren}</p>;
                },
                li: ({ children, ...props }) => {
                  const processedChildren = React.Children.map(children, (child) => {
                    if (typeof child === 'string') {
                      return renderTextWithCitations(child);
                    }
                    return child;
                  });
                  return <li {...props}>{processedChildren}</li>;
                },
                strong: ({ children, ...props }) => {
                  const processedChildren = React.Children.map(children, (child) => {
                    if (typeof child === 'string') {
                      return renderTextWithCitations(child);
                    }
                    return child;
                  });
                  return <strong {...props}>{processedChildren}</strong>;
                },
                em: ({ children, ...props }) => {
                  const processedChildren = React.Children.map(children, (child) => {
                    if (typeof child === 'string') {
                      return renderTextWithCitations(child);
                    }
                    return child;
                  });
                  return <em {...props}>{processedChildren}</em>;
                },
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
              {(() => {
                // Remove the "Sources:" section if it exists
                const sourcesIndex = preprocessedText.lastIndexOf('\n\nSources:');
                if (sourcesIndex !== -1) {
                  return preprocessedText.substring(0, sourcesIndex).trim();
                }
                return preprocessedText;
              })()}
            </ReactMarkdown>

          </div>

          {/* Related Questions */}
          {expanded_queries && expanded_queries.length > 0 && (
            <div className="ml-3">
              <button
                onClick={() => setShowRelatedQuestions(!showRelatedQuestions)}
                className={cn(
                  "flex items-center gap-2 text-xs font-medium",
                  "text-muted-foreground hover:text-foreground transition-colors"
                )}
              >
                <MessageSquare className="w-3 h-3" />
                <span className="uppercase tracking-wider">
                  Related questions ({expanded_queries.length})
                </span>
                {showRelatedQuestions ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
              
              {showRelatedQuestions && (
                <div className="mt-2 space-y-1">
                  {expanded_queries.map((relatedQuery, idx) => (
                    <Link
                      key={idx}
                      href={`/ask?q=${encodeURIComponent(relatedQuery)}`}
                      className={cn(
                        "block p-2 rounded-lg text-sm",
                        "hover:bg-muted transition-colors",
                        "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      → {relatedQuery}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Citation Modal */}
      <CitationModal
        citation={selectedCitation}
        isOpen={!!selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />
    </div>
  );
}