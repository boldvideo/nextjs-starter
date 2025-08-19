"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { AlertCircle, RefreshCw, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  AskResponse, 
  formatAskTime, 
  timeStringToSeconds,
  isClarificationResponse,
  isSynthesizedResponse,
  isErrorResponse,
  ClarificationResponse,
  SynthesizedResponse
} from "@/lib/ask";
import { CitationVideoPlayer } from "@/components/citation-video-player";
import { ChatMessage } from "@/components/chat-message";
import { AskClarificationInline } from "@/components/ask-clarification-inline";
import { useSettings } from "@/components/providers/settings-provider";
import { cn } from "@/lib/utils";

interface AskResultProps {
  query?: string;
}

export function AskResult({ query }: AskResultProps) {
  const [messages, setMessages] = useState<Array<{
    role: "user" | "assistant";
    content: string | React.ReactNode;
    type?: "clarification" | "answer" | "error";
  }>>([]);
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCitations, setExpandedCitations] = useState<Set<string>>(new Set());
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [clarificationCount, setClarificationCount] = useState(0);
  
  // Get settings for AI assistant info
  const settings = useSettings() as any;
  const aiName = settings?.ai_name || "AI Assistant";
  const aiAvatar = settings?.ai_avatar || "/placeholder-avatar.png";

  // Toggle citation video expansion
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

  // Custom renderer for citations in markdown
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
          className="text-primary hover:text-primary/80 font-medium transition-colors"
        >
          [{citationLabel}]
        </button>
      );
    }
    return text;
  }, [toggleCitationExpansion]);

  useEffect(() => {
    if (!query) {
      setMessages([]);
      setResponse(null);
      return;
    }

    // Only fetch on initial mount or when query changes (not conversationId)
    if (conversationId) {
      return; // Skip fetching if we already have a conversation going
    }

    // Add user's question to messages
    setMessages([{ role: "user", content: query }]);

    const fetchAnswer = async () => {
      setIsLoading(true);
      setError(null);
      
      // Add loading message
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      // Simple timeout - 45 seconds
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      try {
        const res = await fetch("/api/ask-global", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ q: query }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`Failed to get answer: ${res.status}`);
        }

        const data = await res.json();
        console.log("[Ask Result] Raw API Response:", data);
        setResponse(data);
        
        // Store conversation ID if present
        if (isClarificationResponse(data) || isSynthesizedResponse(data)) {
          if (data.conversation_id) {
            setConversationId(data.conversation_id);
          }
        }
      } catch (err: any) {
        console.error("[Ask Result] Error:", err);
        
        const errorMessage = err.name === 'AbortError' 
          ? "This is taking longer than expected. Please try again."
          : (err instanceof Error ? err.message : "Failed to get answer");
        
        setError(errorMessage);
        // Replace loading message with error
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { 
            role: "assistant", 
            content: errorMessage,
            type: "error"
          };
          return newMessages;
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnswer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]); // Intentionally not including conversationId to prevent re-fetching

  // Handle clarification submission
  const handleClarificationSubmit = async (clarification: string, convId: string) => {
    // Add user's clarification to messages
    setMessages(prev => [...prev, { role: "user", content: clarification }]);
    
    setIsLoading(true);
    setError(null);
    setClarificationCount(prev => prev + 1);
    
    // Add loading message
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const res = await fetch("/api/ask-global", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          q: clarification,
          conversation_id: convId
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Failed to get answer: ${res.status}`);
      }

      const data = await res.json();
      console.log("[Ask Result] Clarification Response:", data);
      setResponse(data);
      
      // Update conversation ID if needed
      if ((isClarificationResponse(data) || isSynthesizedResponse(data)) && data.conversation_id) {
        setConversationId(data.conversation_id);
      }
    } catch (err: any) {
      console.error("[Ask Result] Clarification Error:", err);
      
      const errorMessage = err.name === 'AbortError'
        ? "This is taking longer than expected. Please try again."
        : (err instanceof Error ? err.message : "Failed to process clarification");
      
      setError(errorMessage);
      // Replace loading message with error
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { 
          role: "assistant", 
          content: errorMessage,
          type: "error"
        };
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderAnswer = useCallback((response: SynthesizedResponse) => {
    const { answer, expanded_queries } = response;
    
    return (
      <div className="space-y-4">
        {/* Answer Text with Citations */}
        <div className="prose prose-neutral dark:prose-invert max-w-none">
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
            }}
          >
            {answer.text}
          </ReactMarkdown>
        </div>

        {/* Citations */}
        {answer.citations && answer.citations.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-border">
            <h4 className="text-sm font-medium text-muted-foreground">Sources</h4>
            {answer.citations.map((citation) => {
              const isExpanded = expandedCitations.has(citation.label);
              return (
                <div
                  key={citation.label}
                  id={`citation-${citation.label}`}
                  className="rounded-lg overflow-hidden"
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
        )}

        {/* Related Questions */}
        {expanded_queries && expanded_queries.length > 0 && (
          <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Related questions</h4>
            <div className="space-y-1">
              {expanded_queries.map((relatedQuery, idx) => (
                <Link
                  key={idx}
                  href={`/ask?q=${encodeURIComponent(relatedQuery)}`}
                  className="block p-2 rounded hover:bg-muted transition-colors text-sm"
                >
                  {relatedQuery}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }, [expandedCitations, toggleCitationExpansion, renderCitation]);

  // Process response and update messages when response changes
  useEffect(() => {
    if (!response) return;

    if (isClarificationResponse(response)) {
      // Replace loading message with clarification
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: "assistant",
          content: <AskClarificationInline 
            response={response} 
            onSubmit={handleClarificationSubmit}
            isLoading={isLoading}
          />,
          type: "clarification"
        };
        return newMessages;
      });
    } else if (isSynthesizedResponse(response)) {
      // Replace loading message with answer
      const answerContent = renderAnswer(response);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: "assistant",
          content: answerContent,
          type: "answer"
        };
        return newMessages;
      });
    } else if (isErrorResponse(response)) {
      // Replace loading message with error
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: "assistant",
          content: `Error: ${response.error}${response.details ? ` - ${response.details}` : ''}`,
          type: "error"
        };
        return newMessages;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response, renderAnswer, handleClarificationSubmit, isLoading]);

  if (!query) {
    return (
      <div className="py-12 text-center">
        <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">
          Ask a question about your videos and get an AI-powered answer with citations
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Try asking &ldquo;What are the best practices for team management?&rdquo;
        </p>
      </div>
    );
  }

  // Main render - chat interface
  return (
    <div className="flex flex-col h-full">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.map((message, idx) => (
          <ChatMessage
            key={idx}
            role={message.role}
            content={message.content}
            isLoading={isLoading && idx === messages.length - 1 && !message.content}
            avatar={aiAvatar}
            name={aiName}
          />
        ))}
      </div>
    </div>
  );
}