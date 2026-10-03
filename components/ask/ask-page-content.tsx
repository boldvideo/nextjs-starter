"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  useAIAskStream,
  askSourceToCitation,
  type AIAskSource,
} from "@/hooks/use-ai-ask-stream";
import { useSettings } from "@/components/providers/settings-provider";
import { getPortalConfig } from "@/lib/portal-config";
import { AskCitation } from "@/lib/ask";
import { AskSourcesRail } from "./ask-sources-rail";

import { AskVideoPanel } from "./ask-video-panel";
import { GymBackdrop } from "@/components/gym/gym-backdrop";
import { GymAskHero } from "@/components/gym/gym-ask-hero";
import { GymFollowUp } from "@/components/gym/gym-follow-up";
import { GymLoading } from "@/components/gym/gym-loading";
import { GymReceiptCard } from "@/components/gym/gym-receipt-card";
import { GymPlan } from "@/components/gym/gym-plan";
import { useGymMember } from "@/components/gym/use-gym-member";
import { useCoachOf } from "@/components/gym/use-coach-map";
import { coachLabel } from "@/components/gym/gym-coaches-data";
import { openFounderNote } from "@/components/gym/gym-founder-note";
import { sharerName } from "@/lib/gym-share";
import { useStreamingScroll } from "@/hooks/use-streaming-scroll";
import { useOnePlayer } from "@/hooks/use-one-player";
import { ScrollToLiveButton } from "@/components/ui/scroll-to-live-button";
import { AttachmentThumbnails } from "@/components/chat/attachment-thumbnails";
import { PoweredByBold } from "@/components/powered-by-bold";
import { AnswerInteraction, SourceOpen } from "@/lib/source-engagement";
import { addXp, markCoin, needsCoin, recordPlay, unlock } from "@/lib/gym-arcade";
import { GymCoinGate } from "@/components/gym/gym-coin-gate";
import { GymBoldCard } from "@/components/gym/gym-bold-card";
import { GymStagePrompt } from "@/components/gym/gym-stage-prompt";
import { track } from "@/lib/gym-track";

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
  const [sourceOpen, setSourceOpen] = useState<SourceOpen>();
  const [images, setImages] = useState<File[]>([]);

  const settings = useSettings();
  const config = getPortalConfig(settings);
  const multimodal = config.ai.multimodal;
  // Fork: our own line; the tenant's disclaimer still describes the old
  // fictional-demo data
  const chatDisclaimer = "AI can be wrong. The clip is the source.";
  
  const [pageState, setPageState] = useState<PageState>(
    routeConversationId ? { status: "loading" } : { status: "idle" }
  );

  const { messages, isStreaming, statusMessage, conversationId, canContinue, streamQuestion, stop, reset, loadConversation } =
    useAIAskStream();

  // INSERT COIN: after the free levels, the next one waits for an email.
  // Signed-in players already gave theirs.
  const { signedIn } = useGymMember();
  const [coinPending, setCoinPending] = useState<(() => void) | null>(null);
  // Why the gate is up when it isn't the free levels running out
  const [coinReason, setCoinReason] = useState<"checkin" | null>(null);
  useEffect(() => {
    if (signedIn) markCoin();
  }, [signedIn]);
  const gated = useCallback(
    (run: () => void) => {
      if (!signedIn && needsCoin()) {
        setCoinPending(() => run);
        return;
      }
      run();
    },
    [signedIn]
  );

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

  // Every thread stays open — a shared or reloaded /ask/<id> link picks the
  // conversation back up (loadConversation restores its id) instead of
  // freezing it read-only.

  const [selectedCitation, setSelectedCitation] = useState<AskCitation | null>(
    null
  );
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // One video at a time: inline clips, the replay panel and the mobile
  // sheet each own a player; starting one pauses the rest
  useOnePlayer();

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
      gated(() => streamQuestion(initialQuery));
    }
    setPageState({ status: "ready" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally minimal deps: runs once per route change
  }, [routeConversationId]);

  // Update URL when a new conversation starts - use History API to avoid navigation
  // This keeps the component mounted with all state intact while making URL shareable
  useEffect(() => {
    // Only update when the live conversation isn't the one in the URL (a new
    // thread, or a visitor who started their own from someone's shared link)
    if (conversationId && conversationId !== routeConversationId) {
      window.history.replaceState(null, "", `/ask/${conversationId}`);
    }
  }, [conversationId, routeConversationId]);



  // Every level you play scores. The first unlocks PRESS START, the third
  // COMBO. Loaded games don't stream, so reading a shared link scores nothing.
  const wasStreamingRef = useRef(false);
  useEffect(() => {
    if (isStreaming && !wasStreamingRef.current) {
      const asked = messages.filter((m) => m.role === "user");
      const levels = asked.length;
      recordPlay(asked[asked.length - 1]?.content ?? "");
      track("Level asked", { level: levels });
      addXp(50, `LEVEL ${String(Math.max(1, levels)).padStart(2, "0")}`);
      unlock("press-start");
      if (levels >= 3) unlock("combo");
    }
    wasStreamingRef.current = isStreaming;
  }, [isStreaming, messages]);

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

      gated(() => {
        setQuery("");
        const submittedImages = images;
        setImages([]);
        streamQuestion(trimmedQuery, submittedImages);
      });
    },
    [query, images, isStreaming, streamQuestion, gated]
  );

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  // A suggested question (wrong-cabinet / thin answers): the next level of
  // your own game, or a fresh game when reading someone else's
  const askSuggested = useCallback(
    (question: string) => {
      if (isStreaming) return;
      gated(() => {
        setQuery("");
        if (canContinue) {
          streamQuestion(question, []);
        } else {
          setSelectedCitation(null);
          setIsPanelOpen(false);
          reset();
          streamQuestion(question, [], { fresh: true });
        }
      });
    },
    [isStreaming, gated, canContinue, streamQuestion, reset]
  );

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

  const handleCitationClick = useCallback((citation: AskCitation, interaction?: AnswerInteraction) => {
    setSourceOpen(interaction ? new SourceOpen(citation.videoId, interaction) : undefined);
    setSelectedCitation(citation);
    setIsPanelOpen(true);
  }, []);

  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedCitation(null);
  }, []);


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
      primaryCount: number;
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
        let primaryCount = 0;

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
          primaryCount = ordered.length;

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
          // No inline refs at all → every retrieved moment is a receipt
          primaryCount: primaryCount || orderedCitations.length,
        });
      }
    }

    return pairs;
  }, [messages, isStreaming]);

  const hasMessages = messages.length > 0;


  // The sources rail always reflects the latest answer.
  const lastPair = qaPairs[qaPairs.length - 1];
  // Shared links carry the sharer's first name (?by=Marcel): visitors see who asked
  const sharedBy = sharerName(searchParams?.get("by"));
  // Who you're talking to in the follow-up bar: the last level's most-cited coach
  const coachOf = useCoachOf();
  const leadCoach = useMemo(() => {
    const counts = new Map<string, { slug: string; name: string; n: number }>();
    for (const c of lastPair?.orderedCitations.slice(0, lastPair.primaryCount) ?? []) {
      const coach = coachOf(c);
      if (!coach) continue;
      const hit = counts.get(coach.slug) ?? { slug: coach.slug, name: coachLabel(coach), n: 0 };
      counts.set(coach.slug, { ...hit, n: hit.n + 1 });
    }
    return Array.from(counts.values()).sort((a, b) => b.n - a.n)[0] ?? null;
  }, [lastPair, coachOf]);
  const selectedPair = sourceOpen && qaPairs.find(pair => pair.assistantMessage?.interaction === sourceOpen.interaction);

  // /ask?q=… paints the thread shape straight away (the stream starts in an
  // effect) instead of flashing the empty hero for a frame.
  const pendingQuery = !hasMessages && !routeConversationId ? searchParams?.get("q") : null;

  if (pageState.status === "loading" || pendingQuery) {
    return (
      <div className="relative flex flex-1 min-h-0 w-full overflow-hidden">
        <GymBackdrop variant="dim" />
        <div className="relative w-full max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
          <div className="h-11 mb-10" />
          {pendingQuery ? (
            <div className="space-y-7">
              <div>
                <span className="inline-block -rotate-2 mb-3 rounded-md bg-[var(--gym-pink)] px-2.5 py-1 font-display text-[13px] uppercase leading-none text-[#1a0616] shadow-[3px_3px_0_var(--gym-yellow)]">
                  Level 01
                </span>
                <h2 className="font-bold text-[26px] md:text-[34px] tracking-[-0.02em] leading-[1.12] text-foreground text-balance">
                  {pendingQuery}
                </h2>
              </div>
              <GymLoading />
              <GymStagePrompt />
            </div>
          ) : (
            <GymLoading status="Loading saved game…" />
          )}
        </div>
      {coinPending && (
        <GymCoinGate
          onInserted={() => {
            const run = coinPending;
            setCoinPending(null);
            run();
          }}
          onLeave={() => setCoinPending(null)}
        />
      )}
      </div>
    );
  }

  if (!hasMessages) {
    return (
      <div className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="relative min-h-full flex flex-col overflow-hidden">
          <GymBackdrop />
          <section className="relative z-10 flex-1 flex items-center px-4 py-14">
            <GymAskHero onAsk={(q) => gated(() => streamQuestion(q))} />
          </section>
        </div>
      {coinPending && (
        <GymCoinGate
          onInserted={() => {
            const run = coinPending;
            setCoinPending(null);
            run();
          }}
          onLeave={() => setCoinPending(null)}
        />
      )}
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 min-h-0 w-full overflow-hidden">
      <GymBackdrop variant="dim" />
      <div className="relative flex flex-col flex-1 min-h-0 min-w-0">
        {/* Scrollable content area */}
        <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto">
          <div className="w-full max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
            {/* Thread head */}
            <div className="flex items-center justify-between mb-10">
              {/* Whose game this is. The coaches themselves are named on each
                  answer ("Coach Drew's take"), since they change per level. */}
              <SetHead reps={qaPairs.length} isOwner={canContinue} sharedBy={sharedBy} />
              <div className="flex items-center gap-4">
                {isStreaming && (
                  <span className="flex items-center gap-1.5 font-osd text-[19px] text-[var(--gym-pink)]">
                    <span className="gym-rec inline-block h-2 w-2 rounded-full bg-[var(--gym-pink)]" />
                    LIVE
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-20">
            {qaPairs.map((pair, pairIndex) => {
              const isLastPair = pairIndex === qaPairs.length - 1;
              const isCurrentlyStreaming = isStreaming && isLastPair;
              const repLabel = String(pairIndex + 1).padStart(2, "0");

              return (
                <div
                  key={pair.userMessage.id}
                  className="space-y-10"
                  {...(isCurrentlyStreaming ? { "data-streaming-message": true } : {})}
                >
                  {pair.userMessage.attachments && pair.userMessage.attachments.length > 0 && (
                    <AttachmentThumbnails attachments={pair.userMessage.attachments} />
                  )}
                  {/* The level: stamp + your question */}
                  <div>
                    {/* Visitors get the question without game jargon on top */}
                    {canContinue && (
                      <span className="gym-slam inline-block -rotate-2 mb-3 rounded-md bg-[var(--gym-pink)] px-2.5 py-1 font-display text-[13px] uppercase leading-none text-[#1a0616] shadow-[3px_3px_0_var(--gym-yellow)]">
                        Level {repLabel}
                      </span>
                    )}
                    <h2 className="font-bold text-[26px] md:text-[34px] tracking-[-0.02em] leading-[1.12] text-foreground text-balance">
                      {pair.userMessage.content}
                    </h2>
                    {isCurrentlyStreaming && (
                      <div className="mt-4">
                        <GymStagePrompt />
                      </div>
                    )}
                  </div>

                  {pair.assistantMessage?.type === "loading" && (
                    <GymLoading status={statusMessage} />
                  )}

                  {pair.assistantMessage?.type === "error" && (
                    <div className="rounded-xl border border-[var(--destructive)]/40 bg-[var(--destructive)]/10 px-4 py-3 text-sm text-foreground/90">
                      <span className="font-display uppercase text-[var(--destructive)] mr-2">Game over.</span>
                      {pair.assistantMessage.content}
                      <span className="block mt-1.5 font-osd text-[17px] text-muted-foreground">INSERT COIN TO TRY AGAIN: ASK IT ONE MORE TIME BELOW.</span>
                    </div>
                  )}

                  {pair.assistantMessage && pair.assistantMessage.type !== "loading" && pair.assistantMessage.type !== "error" && (
                    <div>
                      <GymPlan
                        content={pair.assistantMessage.content}
                        citations={pair.citations}
                        onCitationClick={citation => handleCitationClick(citation, pair.assistantMessage?.interaction)}
                        isStreaming={isCurrentlyStreaming}
                        citationDisplayNumberById={pair.citationDisplayNumberById}
                        selectedCitationId={selectedCitation?.id}
                        interaction={pair.assistantMessage.interaction}
                        shareUrl={conversationId ? `${window.location.origin}/ask/${conversationId}` : undefined}
                        printUrl={conversationId && !isCurrentlyStreaming ? `/plan/${conversationId}` : undefined}
                        onAsk={askSuggested}
                        isOwner={canContinue}
                        onNeedCoin={(run) => {
                          setCoinReason("checkin");
                          setCoinPending(() => run);
                        }}
                      />
                    </div>
                  )}

                  {/* Clips, only when the plan couldn't pin them inline (no refs
                      in the text) */}
                  {pair.orderedCitations.length > 0 && !isCurrentlyStreaming &&
                    !/\[(?:\d+|c_[^\]]+)\]/.test(pair.assistantMessage?.content ?? "") && (
                    <div>
                      <p className="mb-3 font-display text-sm uppercase gym-sunset-text">Clips</p>
                      <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1 snap-x snap-mandatory">
                        {pair.orderedCitations.slice(0, pair.primaryCount).map((c) => (
                          <GymReceiptCard
                            key={c.id}
                            citation={c}
                            number={pair.citationDisplayNumberById.get(c.id)}
                            selected={selectedCitation?.id === c.id}
                            onClick={() => handleCitationClick(c, pair.assistantMessage?.interaction)}
                            className="shrink-0 w-[230px] m-0 snap-start"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* After the second level: Bold's one pitch (once, dismissible) */}
                  {pairIndex === 1 && !isCurrentlyStreaming && pair.assistantMessage?.type !== "loading" && (
                    <GymBoldCard
                      moments={pair.primaryCount}
                      sessions={new Set(pair.orderedCitations.slice(0, pair.primaryCount).map((c) => c.videoId)).size}
                    />
                  )}

                  {!isLastPair && (
                    <div className="h-px bg-[linear-gradient(90deg,transparent,var(--gym-line),transparent)]" />
                  )}
                </div>
              );
            })}
            </div>
          </div>
        </div>

        {/* Footer: follow-up bar */}
        {(
          <div className="relative flex-shrink-0 bg-[linear-gradient(180deg,transparent,var(--gym-night)_35%)] pt-4">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-10">
              <ScrollToLiveButton
                visible={showScrollButton}
                isStreaming={isStreaming}
                onClick={jumpToLive}
              />
            </div>
            <div className="w-full max-w-3xl mx-auto px-4 pb-3 md:px-6 md:pb-4">
              {canContinue ? (
                <GymFollowUp
                  value={query}
                  onChange={setQuery}
                  onSubmit={() => handleSubmit()}
                  onStop={handleStop}
                  isStreaming={isStreaming}
                  coach={leadCoach}
                />
              ) : (
                <>
                  {/* Someone else's shared game: read it, then start your own
                      (the homepage's start bar, not a follow-up). The server
                      refuses follow-ups without the owner token. */}
                  <GymFollowUp
                    variant="new-game"
                    value={query}
                    onChange={setQuery}
                    onSubmit={() => {
                      const q = query.trim();
                      if (!q) return;
                      gated(() => {
                        setQuery("");
                        setSelectedCitation(null);
                        setIsPanelOpen(false);
                        reset();
                        streamQuestion(q, [], { fresh: true });
                      });
                    }}
                    onStop={handleStop}
                    isStreaming={isStreaming}
                  />
                </>
              )}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 mt-2.5 px-1">
                {chatDisclaimer ? (
                  <p className="text-[11px] text-muted-foreground/60 text-center sm:text-left">{chatDisclaimer}</p>
                ) : <span />}
                <PoweredByBold variant="pitch" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Replay panel (desktop): opens when a citation chip is clicked */}
      {isDesktop && selectedCitation && (
        <AskSourcesRail
          citations={(selectedCitation ? selectedPair : lastPair)?.orderedCitations ?? []}
          displayNumberById={(selectedCitation ? selectedPair : lastPair)?.citationDisplayNumberById}
          selectedCitation={selectedCitation}
          engagement={sourceOpen}
          onSelect={citation => citation
            ? handleCitationClick(citation, selectedCitation ? sourceOpen?.interaction : lastPair?.assistantMessage?.interaction)
            : handleClosePanel()}
          isStreaming={isStreaming}
          primaryCount={(selectedCitation ? selectedPair : lastPair)?.primaryCount}
          className="relative"
        />
      )}

      {/* Mobile: video source overlay */}
      {!isDesktop && (
        <AskVideoPanel
          citation={selectedCitation}
          engagement={sourceOpen}
          isOpen={isPanelOpen}
          onClose={handleClosePanel}
        />
      )}
      {coinPending && (
        <GymCoinGate
          reason={coinReason ?? undefined}
          onInserted={() => {
            const run = coinPending;
            setCoinPending(null);
            setCoinReason(null);
            run();
          }}
          onLeave={() => {
            setCoinPending(null);
            setCoinReason(null);
          }}
        />
      )}
    </div>
  );
}

/** "Your game · 2 levels", or "Marcel's game · playing for Acme" when signed in. */
function SetHead({ reps, isOwner, sharedBy }: { reps: number; isOwner: boolean; sharedBy: string | null }) {
  const { user, member } = useGymMember();
  const first = (user?.name || "").split(" ")[0];
  const company = member?.profile?.business_name;
  const whose = first ? `${first}'s game` : "Your game";

  // A shared link, seen by someone new: who asked whom, and what this is
  if (!isOwner) {
    return (
      <div className="flex items-center gap-3">
        <Image src="/gym/game/game-master-bot.webp" alt="" width={40} height={40} className="h-10 w-10" />
        <div className="flex flex-col leading-none">
          <span className="font-display text-base uppercase text-foreground">
            {sharedBy ?? "A founder"} asked the coaches
          </span>
          <button
            type="button"
            onClick={openFounderNote}
            className="mt-1 self-start font-osd text-[17px] text-[var(--gym-cyan)] hover:underline cursor-pointer"
          >
            WHAT IS THIS?
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {isOwner && user?.image ? (
        <img src={user.image} alt="" referrerPolicy="no-referrer" className="h-10 w-10 rounded-full ring-2 ring-[var(--gym-pink)]" />
      ) : (
        <Image src="/gym/game/logo.webp" alt="" width={40} height={40} className="h-10 w-10" />
      )}
      <div className="flex flex-col leading-none">
        <span className="font-display text-base uppercase text-foreground">{whose}</span>
        <span className="mt-1 font-osd text-[17px] text-muted-foreground">
          {reps} {reps === 1 ? "LEVEL" : "LEVELS"}
          {isOwner && company ? ` · PLAYING FOR ${company.toUpperCase()}` : ""}
        </span>
      </div>
    </div>
  );
}
