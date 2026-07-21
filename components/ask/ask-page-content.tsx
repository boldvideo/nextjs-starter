"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { PersonaAvatar } from "@/components/persona-avatar";
import {
  useAIAskStream,
  askSourceToCitation,
  type AIAskSource,
} from "@/hooks/use-ai-ask-stream";
import { useSettings } from "@/components/providers/settings-provider";
import { getPortalConfig } from "@/lib/portal-config";
import { cn } from "@/lib/utils";
import { AskCitation } from "@/lib/ask";
import { AskMessageCard } from "./ask-message-card";
import { AskSourcesCarousel } from "./ask-sources-carousel";
import { AskSourcesRail } from "./ask-sources-rail";

import { AskVideoPanel } from "./ask-video-panel";
import { AskEmptyState } from "./ask-empty-state";
import { ChatInput } from "@/components/coach";
import { AskLoadingState } from "./ask-loading-state";
import { AskReadOnlyFooter } from "./ask-read-only-footer";
import { useStreamingScroll } from "@/hooks/use-streaming-scroll";
import { ScrollToLiveButton } from "@/components/ui/scroll-to-live-button";
import { AttachmentThumbnails } from "@/components/chat/attachment-thumbnails";
import { PoweredByBold } from "@/components/powered-by-bold";

type PageState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; message: string };

// Shared empty map so pairs without citations keep a stable prop identity
// across re-renders (memo hygiene for AskMessageCard's sections).
const EMPTY_DISPLAY_MAP = new Map<string, number>();

interface AskPageContentProps {
  conversationId?: string;
}

export function AskPageContent({ conversationId: routeConversationId }: AskPageContentProps = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [images, setImages] = useState<File[]>([]);

  const settings = useSettings();
  const config = getPortalConfig(settings);
  const multimodal = config.ai.multimodal;
  const aiName = config.ai.name;
  const aiAvatar = config.ai.avatar;
  const greeting = config.ai.greeting || "What do you want to know?";
  const chatDisclaimer = config.ai.chatDisclaimer;
  
  // Deterministic pick — shuffling with Math.random() here caused a
  // server/client hydration mismatch.
  const suggestions = useMemo(() => {
    const starters = config.ai.conversationStarters || [];
    return starters.slice(0, 4);
  }, [config.ai.conversationStarters]);

  const [pageState, setPageState] = useState<PageState>(
    routeConversationId ? { status: "loading" } : { status: "idle" }
  );

  const { messages, isStreaming, statusMessage, conversationId, streamQuestion, stop, reset, loadConversation } =
    useAIAskStream();

  // Generate stable streaming message ID for scroll behavior
  const streamingMessageId = useMemo(() => {
    if (!isStreaming) return null;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === "assistant") {
      return `streaming-${messages.length}`;
    }
    return null;
  }, [isStreaming, messages]);

  // Streaming scroll behavior - scrolls to message top, not bottom
  const {
    scrollContainerRef,
    showScrollButton,
    jumpToLive,
  } = useStreamingScroll({
    isStreaming,
    streamingMessageId,
    messageSelector: "[data-streaming-message]",
  });

  // Determine if this is a read-only historical view
  // Read-only when: loaded from URL route parameter
  const isReadOnly = Boolean(routeConversationId);

  const [selectedCitation, setSelectedCitation] = useState<AskCitation | null>(
    null
  );
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // The rail (desktop) and the overlay (mobile) both embed a video player —
  // gate on the breakpoint so only one is ever mounted.
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const update = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

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



  // Drop in-flight image selections if the multimodal capability flips off mid-session
  useEffect(() => {
    if (!multimodal.enabled && images.length > 0) {
      setImages([]);
    }
  }, [multimodal.enabled, images.length]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmedQuery = query.trim();
      if ((!trimmedQuery && images.length === 0) || isStreaming) return;

      setQuery("");
      const submittedImages = images;
      setImages([]);
      await streamQuestion(trimmedQuery, submittedImages);
    },
    [query, images, isStreaming, streamQuestion]
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

  // Header "Ask …" pill starts a new chat even when this page is already
  // mounted with an active conversation.
  useEffect(() => {
    const onNewChat = () => {
      stop();
      reset();
      setQuery("");
      setSelectedCitation(null);
      setIsPanelOpen(false);
      setPageState({ status: "idle" });
      window.history.replaceState(null, "", "/ask");
    };
    window.addEventListener("bold:ask-new-chat", onNewChat);
    return () => window.removeEventListener("bold:ask-new-chat", onNewChat);
  }, [reset, stop]);

  const handleCitationClick = useCallback((citation: AskCitation) => {
    setSelectedCitation(citation);
    setIsPanelOpen(true);
  }, []);

  const handleSelectCitation = useCallback((citation: AskCitation | null) => {
    setSelectedCitation(citation);
    setIsPanelOpen(!!citation);
  }, []);

  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedCitation(null);
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

  // Per-message caches keyed by assistant message id. Citation arrays and the
  // display-number map keep a stable identity across text_delta re-renders so
  // the memoized markdown sections in AskMessageCard don't re-parse the whole
  // answer on every streamed chunk.
  const citationsCacheRef = useRef(
    new Map<
      string,
      {
        sources?: AIAskSource[];
        extras?: AIAskSource[];
        sourceCitations: AskCitation[];
        citations: AskCitation[];
      }
    >()
  );
  const displayMapCacheRef = useRef(
    new Map<
      string,
      {
        citations: AskCitation[];
        orderKey: string;
        ordered: AskCitation[];
        map: Map<string, number>;
      }
    >()
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

        // Retrieved sources resolve positional [1]-style refs; citation_map
        // entries (stable c_xxx ids) are appended so [c_xxx] refs resolve
        // during streaming. Appending keeps numeric indices untouched.
        let sourceCitations: AskCitation[] = [];
        let citations: AskCitation[] = [];
        if (assistantMsg) {
          const cached = citationsCacheRef.current.get(assistantMsg.id);
          if (
            cached &&
            cached.sources === assistantMsg.sources &&
            cached.extras === assistantMsg.citationSources
          ) {
            ({ sourceCitations, citations } = cached);
          } else {
            sourceCitations =
              assistantMsg.sources?.map((s, idx) =>
                askSourceToCitation(s, idx)
              ) || [];
            const seenIds = new Set(sourceCitations.map((c) => c.id));
            const extraCitations = (assistantMsg.citationSources || [])
              .filter((s) => s.id && !seenIds.has(s.id))
              .map((s, idx) =>
                askSourceToCitation(s, sourceCitations.length + idx)
              );
            citations = [...sourceCitations, ...extraCitations];
            citationsCacheRef.current.set(assistantMsg.id, {
              sources: assistantMsg.sources,
              extras: assistantMsg.citationSources,
              sourceCitations,
              citations,
            });
          }
        }

        // Compute citation ordering for this pair. While the answer streams,
        // only text-referenced moments surface (append-only, stable numbers);
        // leftovers from the retrieval set join at rest.
        const stillStreaming = isStreaming && i >= messages.length - 2;
        let orderedCitations = stillStreaming ? [] : citations;
        let displayMap = EMPTY_DISPLAY_MAP;

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

          // Unreferenced leftovers only from the retrieval set — the
          // citation_map carries every candidate moment and would flood the
          // sources rail.
          if (!stillStreaming) {
            for (const citation of sourceCitations) {
              if (!seenIds.has(citation.id)) {
                seenIds.add(citation.id);
                ordered.push(citation);
              }
            }
          }

          // Reuse the cached ordered array + display map when the order hasn't
          // changed, so identities stay stable across streamed deltas.
          const orderKey = ordered.map((c) => c.id).join(",");
          const cachedOrder = displayMapCacheRef.current.get(assistantMsg.id);
          if (
            cachedOrder &&
            cachedOrder.citations === citations &&
            cachedOrder.orderKey === orderKey
          ) {
            orderedCitations = cachedOrder.ordered;
            displayMap = cachedOrder.map;
          } else {
            const map = new Map<string, number>();
            ordered.forEach((c, idx) => map.set(c.id, idx + 1));
            orderedCitations = ordered;
            displayMap = map;
            displayMapCacheRef.current.set(assistantMsg.id, {
              citations,
              orderKey,
              ordered,
              map,
            });
          }
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
  }, [messages, isStreaming]);

  const placeholder = "Ask a follow-up…";

  const hasMessages = messages.length > 0;

  // "Ask" prefix is rendered separately in the thread head — strip it from
  // the configured name (e.g. "Ask Anton" → "Anton").
  const personaDisplayName = aiName.replace(/^ask\s+/i, "");

  // The sources rail always reflects the latest answer.
  const lastPair = qaPairs[qaPairs.length - 1];

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
        placeholder="Type your request…"
        disclaimer={chatDisclaimer}
        onAsk={(q) => streamQuestion(q)}
        multimodalEnabled={multimodal.enabled}
        images={images}
        onImagesChange={setImages}
        maxImages={multimodal.maxImages}
        acceptedMediaTypes={multimodal.acceptedMediaTypes}
      />
    );
  }

  return (
    <div className="flex flex-1 min-h-0 w-full overflow-hidden">
      <div className="flex flex-col flex-1 min-h-0 min-w-0">
        {/* Scrollable content area */}
        <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto">
          <div className="w-full max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
            {/* Thread head — lives inside the content column */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2.5">
                <PersonaAvatar name={personaDisplayName} avatar={aiAvatar} size={30} />
                <span className="font-[family-name:var(--font-heading)] text-base tracking-tight">
                  <span className="text-muted-foreground/70 font-normal mr-1.5">
                    Ask
                  </span>
                  <span className="font-semibold">{personaDisplayName}</span>
                </span>
              </div>
              <button
                onClick={handleReset}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer",
                  "text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
                  "text-sm whitespace-nowrap"
                )}
                title="Start new chat"
              >
                <Plus className="h-[15px] w-[15px]" />
                <span className="hidden sm:inline">New chat</span>
              </button>
            </div>

            <div className="space-y-12">
            {qaPairs.map((pair, pairIndex) => {
              const isLastPair = pairIndex === qaPairs.length - 1;
              const isCurrentlyStreaming = isStreaming && isLastPair;

              return (
                <div
                  key={pair.userMessage.id}
                  className="space-y-8"
                  {...(isCurrentlyStreaming ? { "data-streaming-message": true } : {})}
                >
                  {/* User's question as title, with optional attachment thumbnails */}
                  {pair.userMessage.attachments && pair.userMessage.attachments.length > 0 && (
                    <AttachmentThumbnails attachments={pair.userMessage.attachments} />
                  )}
                  <div className="flex items-start gap-3">
                    <span className="srl-eyebrow shrink-0 mt-[7px] text-muted-foreground">
                      Request
                    </span>
                    <h2 className="font-[family-name:var(--font-heading)] font-bold text-2xl md:text-3xl tracking-tight leading-[1.15]">
                      {pair.userMessage.content}
                    </h2>
                  </div>

                  {/* Loading state */}
                  {pair.assistantMessage?.type === "loading" && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">{statusMessage || "Reading across the series…"}</span>
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
                      selectedCitationId={selectedCitation?.id}
                    />
                  )}

                  {/* Video sources carousel — mobile only; desktop uses the rail */}
                  {pair.orderedCitations.length > 0 && !isCurrentlyStreaming && (
                    <div className="lg:hidden">
                      <AskSourcesCarousel
                        citations={pair.orderedCitations}
                        onCitationClick={handleCitationClick}
                        selectedCitationId={selectedCitation?.id}
                      />
                    </div>
                  )}

                  {/* Divider between Q&A pairs (not after the last one) */}
                  {!isLastPair && (
                    <div className="border-t border-border/50 pt-4" />
                  )}
                </div>
              );
            })}
            </div>
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
          <div className="relative flex-shrink-0 border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            {/* Scroll to live button */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-10">
              <ScrollToLiveButton
                visible={showScrollButton}
                isStreaming={isStreaming}
                onClick={jumpToLive}
              />
            </div>
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
                multimodalEnabled={multimodal.enabled}
                images={images}
                onImagesChange={setImages}
                maxImages={multimodal.maxImages}
                acceptedMediaTypes={multimodal.acceptedMediaTypes}
              />
              {/* The moment of wow is a cited answer — that's when this sells */}
              <div className="flex justify-center mt-2">
                <PoweredByBold variant="pitch" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sources rail (desktop) — expands into the video source panel */}
      {isDesktop && (
        <AskSourcesRail
          citations={lastPair?.orderedCitations ?? []}
          displayNumberById={lastPair?.citationDisplayNumberById}
          selectedCitation={selectedCitation}
          onSelect={handleSelectCitation}
          isStreaming={isStreaming}
        />
      )}

      {/* Mobile: video source overlay */}
      {!isDesktop && (
        <AskVideoPanel
          citation={selectedCitation}
          isOpen={isPanelOpen}
          onClose={handleClosePanel}
        />
      )}
    </div>
  );
}
