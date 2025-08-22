"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SynthesizedResponse, timeStringToSeconds } from "@/lib/ask";
import { CitationVideoPlayer } from "@/components/citation-video-player";
import { ChevronDown, ChevronUp, Sparkles, Clock, MessageSquare } from "lucide-react";
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
  const [expandedCitations, setExpandedCitations] = useState<Set<string>>(new Set());
  const [showRelatedQuestions, setShowRelatedQuestions] = useState(false);
  const { answer, expanded_queries } = response;

  // Toggle citation expansion
  const toggleCitationExpansion = useCallback((citationLabel: string) => {
    setExpandedCitations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(citationLabel)) {
        newSet.delete(citationLabel);
      } else {
        newSet.add(citationLabel);
      }
      return newSet;
    });
  }, []);

  // Render citation links in markdown
  const renderCitation = useCallback((text: string) => {
    const citationMatch = text.match(/^\[([S]\d+)\]$/);
    if (citationMatch) {
      const citationLabel = citationMatch[1];
      return (
        <button
          onClick={() => {
            toggleCitationExpansion(citationLabel);
            setTimeout(() => {
              const element = document.getElementById(`citation-${citationLabel}`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 100);
          }}
          className="text-primary hover:text-primary/80 font-medium transition-colors text-xs align-super"
        >
          [{citationLabel}]
        </button>
      );
    }
    return text;
  }, [toggleCitationExpansion]);

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

      {/* Answer Content - Always full width */}
      <div className="flex-1">
        <span className="text-xs text-muted-foreground ml-3">{aiName}</span>
        
        <div className="mt-1 space-y-4">
          {/* Main Answer - No bubble, just text */}
          <div className={cn(
            "prose prose-base max-w-none text-foreground",
            "dark:prose-invert", // This is the key - invert prose colors in dark mode
            "prose-p:my-3 prose-headings:mt-4 prose-headings:mb-2",
            "prose-strong:font-semibold prose-li:my-1"
          )}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children, ...props }) => {
                  const processedChildren = Array.isArray(children) 
                    ? children.map((child, idx) => {
                        if (typeof child === 'string') {
                          const parts = child.split(/(\[[S]\d+\])/g);
                          return parts.map((part, partIdx) => {
                            if (part.match(/^\[[S]\d+\]$/)) {
                              return <span key={`${idx}-${partIdx}`}>{renderCitation(part)}</span>;
                            }
                            return <span key={`${idx}-${partIdx}`}>{part}</span>;
                          });
                        }
                        return child;
                      })
                    : children;
                  
                  return <p {...props}>{processedChildren}</p>;
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
              {answer.text}
            </ReactMarkdown>

          </div>

          {/* Citations - Only show if there are citations */}
          {answer.citations && answer.citations.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 ml-3">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Sources ({answer.citations.length})
                </span>
              </div>
              
              <div className="space-y-2">
                {answer.citations.map((citation) => {
                  const isExpanded = expandedCitations.has(citation.label);
                  return (
                    <div
                      key={citation.label}
                      id={`citation-${citation.label}`}
                      className="rounded-lg overflow-hidden transition-all"
                    >
                      <CitationVideoPlayer
                        videoId={citation.video_id}
                        playbackId={citation.mux_playback_id || ""}
                        videoTitle={citation.video_title}
                        startTime={timeStringToSeconds(citation.start_time)}
                        endTime={citation.end_time ? timeStringToSeconds(citation.end_time) : undefined}
                        label={citation.label}
                        speaker={citation.speaker}
                        isExpanded={isExpanded}
                        onToggle={() => toggleCitationExpansion(citation.label)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

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
    </div>
  );
}