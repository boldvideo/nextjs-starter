"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import Image from "next/image";
import {
  useAIAskStream,
  askSourceToCitation,
} from "@/hooks/use-ai-ask-stream";
import { useSettings } from "@/components/providers/settings-provider";
import { getPortalConfig } from "@/lib/portal-config";
import { cn } from "@/lib/utils";
import { AskCitation } from "@/lib/ask";
import { AskMessageCard } from "./ask-message-card";
import { AskSourcesCarousel } from "./ask-sources-carousel";

import { AskVideoPanel } from "./ask-video-panel";
import { AskEmptyState } from "./ask-empty-state";
import { ChatInput } from "@/components/coach";
import { AskLoadingState } from "./ask-loading-state";
import { AskReadOnlyFooter } from "./ask-read-only-footer";

type PageState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; message: string };

interface AskPageContentProps {
  conversationId?: string;
}

export function AskPageContent({ conversationId: routeConversationId }: AskPageContentProps = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollToBottomRef = useRef<HTMLDivElement>(null);

  const settings = useSettings();
  const config = getPortalConfig(settings);
  const aiName = config.ai.name;
  const aiAvatar = config.ai.avatar;
  const greeting = config.ai.greeting || "How can I help you today?";
  const chatDisclaimer = config.ai.chatDisclaimer;
  
  const suggestions = useMemo(() => {
    const starters = config.ai.conversationStarters || [];
    if (starters.length <= 4) return starters;
    const shuffled = [...starters].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 4);
  }, [config.ai.conversationStarters]);

  const [pageState, setPageState] = useState<PageState>(
    routeConversationId ? { status: "loading" } : { status: "idle" }
  );

  const { messages, isStreaming, conversationId, streamQuestion, stop, reset, loadConversation } =
    useAIAskStream();

  // Determine if this is a read-only historical view
  // Read-only when: loaded from URL route parameter
  const isReadOnly = Boolean(routeConversationId);

  const [selectedCitation, setSelectedCitation] = useState<AskCitation | null>(
    null
  );
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const hasInitializedRef = useRef(false);
  const prevRouteConversationIdRef = useRef<string | undefined>(routeConversationId);

  // Reset when navigating from /ask/[id] to /ask (routeConversationId becomes undefined)
  useEffect(() => {
    const prevId = prevRouteConversationIdRef.current;
    prevRouteConversationIdRef.current = routeConversationId;

    // If we had a conversation ID and now we don't, user navigated to /ask - reset
    if (prevId && !routeConversationId) {
      reset();
      setQuery("");
      setSelectedCitation(null);
      setIsPanelOpen(false);
      setPageState({ status: "idle" });
      hasInitializedRef.current = false;
    }
  }, [routeConversationId, reset]);

  // Load conversation from route (deep link only) OR process initial query
  useEffect(() => {
    // If we have a route conversation ID AND no messages, we're deep linking - fetch
    if (routeConversationId && messages.length === 0) {
      setPageState({ status: "loading" });
      loadConversation(routeConversationId).then((success) => {
        if (success) {
          setPageState({ status: "ready" });
        } else {
          // Conversation not found - redirect to /ask
          router.replace("/ask", { scroll: false });
        }
      });
      return;
    }

    // If we have routeConversationId but also have messages, we're already loaded
    if (routeConversationId && messages.length > 0) {
      setPageState({ status: "ready" });
      return;
    }

    // No route conversation ID - check for query param
    const initialQuery = searchParams?.get("q");
    if (initialQuery && !hasInitializedRef.current && messages.length === 0) {
      hasInitializedRef.current = true;
      streamQuestion(initialQuery);
    }
    setPageState({ status: "ready" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally minimal deps: runs once per route change
  }, [routeConversationId]);

  // Update URL when a new conversation starts - use History API to avoid navigation
  // This keeps the component mounted with all state intact while making URL shareable
  useEffect(() => {
    // Only update if we have a conversation ID and we're not already on a conversation route
    if (conversationId && !routeConversationId) {
      window.history.replaceState(null, "", `/ask/${conversationId}`);
    }
  }, [conversationId, routeConversationId]);

  useEffect(() => {
    if (scrollToBottomRef.current && isStreaming) {
      scrollToBottomRef.current.scrollIntoView({
        behavior: "auto",
        block: "end",
      });
    }
  }, [messages, isStreaming]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmedQuery = query.trim();
      if (!trimmedQuery || isStreaming) return;

      setQuery("");
      await streamQuestion(trimmedQuery);
    },
    [query, isStreaming, streamQuestion]
  );

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  const handleReset = useCallback(() => {
    reset();
    setQuery("");
    setSelectedCitation(null);
    setIsPanelOpen(false);
    setPageState({ status: "idle" });
    // Update URL without navigation - state is already cleared
    window.history.replaceState(null, "", "/ask");
  }, [reset]);

  const handleCitationClick = useCallback((citation: AskCitation) => {
    setSelectedCitation(citation);
    setIsPanelOpen(true);
  }, []);

  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  // Handle clicking a suggestion in read-only mode
  // Navigates to /ask and triggers the question
  const handleReadOnlySuggestionClick = useCallback(
    (suggestion: string) => {
      // Navigate to /ask with the question as a query param
      router.push(`/ask?q=${encodeURIComponent(suggestion)}`, { scroll: false });
    },
    [router]
  );

  // Group messages into Q&A pairs for display
  const qaPairs = useMemo(() => {
    const pairs: Array<{
      userMessage: (typeof messages)[0];
      assistantMessage: (typeof messages)[0] | null;
      citations: AskCitation[];
      orderedCitations: AskCitation[];
      citationDisplayNumberById: Map<string, number>;
    }> = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === "user") {
        const assistantMsg =
          messages[i + 1]?.role === "assistant" ? messages[i + 1] : null;
        const citations =
          assistantMsg?.sources?.map((s, idx) => askSourceToCitation(s, idx)) ||
          [];

        // Compute citation ordering for this pair
        let orderedCitations = citations;
        const displayMap = new Map<string, number>();

        if (assistantMsg?.content && citations.length > 0) {
          const matches = Array.from(
            assistantMsg.content.matchAll(/\[(\d+|c_[^\]]+)\]/g)
          );
          const seenIds = new Set<string>();
          const ordered: AskCitation[] = [];

          for (const m of matches) {
            const ref = m[1];
            let citation: AskCitation | undefined;

            if (ref.startsWith("c_")) {
              citation = citations.find((c) => c.id === ref);
            } else {
              const idx = parseInt(ref, 10) - 1;
              if (idx >= 0 && idx < citations.length) {
                citation = citations[idx];
              }
            }

            if (!citation || seenIds.has(citation.id)) continue;
            seenIds.add(citation.id);
            ordered.push(citation);
          }

          for (const citation of citations) {
            if (!seenIds.has(citation.id)) {
              seenIds.add(citation.id);
              ordered.push(citation);
            }
          }

          orderedCitations = ordered;
          ordered.forEach((c, idx) => displayMap.set(c.id, idx + 1));
        }

        pairs.push({
          userMessage: msg,
          assistantMessage: assistantMsg,
          citations,
          orderedCitations,
          citationDisplayNumberById: displayMap,
        });
      }
    }

    return pairs;
  }, [messages]);

  const placeholder = "Ask a follow up question";

  const hasMessages = messages.length > 0;

  if (pageState.status === "loading") {
    return <AskLoadingState />;
  }

  if (!hasMessages) {
    return (
      <AskEmptyState
        query={query}
        setQuery={setQuery}
        onSubmit={handleSubmit}
        onStop={handleStop}
        isStreaming={isStreaming}
        aiName={aiName}
        aiAvatar={aiAvatar}
        greeting={greeting}
        suggestions={suggestions}
        placeholder="What's on your mind?"
        disclaimer={chatDisclaimer}
      />
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] w-full">
      <div
        className={cn(
          "flex flex-col flex-1 transition-all duration-300",
          isPanelOpen ? "mr-0 lg:mr-[500px] xl:mr-[600px]" : ""
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            {aiAvatar && (
              <Image
                src={aiAvatar}
                alt={aiName}
                width={36}
                height={36}
                className="rounded-full"
              />
            )}
            <h1 className="text-lg md:text-xl font-semibold">{aiName}</h1>
          </div>
          <button
            onClick={handleReset}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer",
              "text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
              "text-sm"
            )}
            title="Start new chat"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>

        {/* Scrollable content area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
          <div className="w-full max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-12">
            {qaPairs.map((pair, pairIndex) => {
              const isLastPair = pairIndex === qaPairs.length - 1;
              const isCurrentlyStreaming = isStreaming && isLastPair;

              return (
                <div key={pair.userMessage.id} className="space-y-8">
                  {/* User's question as title */}
                  <h2 className="text-2xl font-semibold">{pair.userMessage.content}</h2>

                  {/* Loading state */}
                  {pair.assistantMessage?.type === "loading" && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  )}

                  {/* Error state */}
                  {pair.assistantMessage?.type === "error" && (
                    <div className="text-destructive text-sm py-2">
                      {pair.assistantMessage.content}
                    </div>
                  )}

                  {/* Answer */}
                  {pair.assistantMessage && pair.assistantMessage.type !== "loading" && pair.assistantMessage.type !== "error" && (
                    <AskMessageCard
                      content={pair.assistantMessage.content}
                      citations={pair.citations}
                      aiName={aiName}
                      aiAvatar={aiAvatar}
                      onCitationClick={handleCitationClick}
                      isStreaming={isCurrentlyStreaming}
                      citationDisplayNumberById={pair.citationDisplayNumberById}
                    />
                  )}

                  {/* Video sources carousel - below text */}
                  {pair.orderedCitations.length > 0 && !isCurrentlyStreaming && (
                    <AskSourcesCarousel
                      citations={pair.orderedCitations}
                      onCitationClick={handleCitationClick}
                      selectedCitationId={selectedCitation?.id}
                    />
                  )}

                  {/* Divider between Q&A pairs (not after the last one) */}
                  {!isLastPair && (
                    <div className="border-t border-border/50 pt-4" />
                  )}
                </div>
              );
            })}



            <div ref={scrollToBottomRef} />
          </div>
        </div>

        {/* Footer: Input for active conversations, CTA for read-only */}
        {isReadOnly ? (
          <AskReadOnlyFooter
            onStartNew={handleReset}
            suggestions={suggestions}
            onSuggestionClick={handleReadOnlySuggestionClick}
          />
        ) : (
          <div className="flex-shrink-0 border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="w-full max-w-3xl mx-auto px-4 py-3 md:px-6 md:py-4">
              <ChatInput
                value={query}
                onChange={setQuery}
                onSubmit={handleSubmit}
                onStop={handleStop}
                placeholder={placeholder}
                disabled={false}
                isStreaming={isStreaming}
                autoFocus={false}
                suggestions={[]}
                showSuggestions={false}
                disclaimer={chatDisclaimer}
              />
            </div>
          </div>
        )}
      </div>

      <AskVideoPanel
        citation={selectedCitation}
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
      />
    </div>
  );
}
