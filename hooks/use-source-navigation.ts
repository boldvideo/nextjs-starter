"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnswerInteraction, SourceOpen } from "@/lib/source-engagement";
import { isSearchRequestId } from "@/lib/search-request";

/** Only explicitly attributed URLs start opens; ordinary/autoplay navigation never does. */
export function useSourceNavigation(videoId: string) {
  const params = useSearchParams();
  const interactionId = params?.get("interaction_id");
  const query = params?.get("search_query");
  const requestId = params?.get("search_request_id");
  const answerRequestId = params?.get("answer_request_id");
  const timestamp = params?.get("t");
  const key = JSON.stringify([videoId, interactionId, query, requestId, answerRequestId, timestamp]);
  const current = useRef<{
    key: string;
    open: SourceOpen;
    deadline: number;
    settlement?: Promise<string | null | undefined>;
  } | null>(null);
  const [open, setOpen] = useState<SourceOpen>();

  useEffect(() => {
    if (!isSearchRequestId(interactionId) && !isSearchRequestId(answerRequestId) && !(query && isSearchRequestId(requestId))) {
      current.current = null;
      setOpen(undefined);
      return;
    }
    if (current.current?.key !== key) {
      const interaction = new AnswerInteraction(isSearchRequestId(interactionId) ? interactionId : undefined);
      current.current = { key, open: new SourceOpen(videoId, interaction), deadline: Date.now() + 30_000 };
    }
    setOpen(current.current.open);
    if (!current.current.open.interaction.id && !answerRequestId) {
      const entry = current.current;
      const interaction = entry.open.interaction;
      let disposed = false;
      let retry: ReturnType<typeof setTimeout> | undefined;
      const expiry = setTimeout(() => interaction.complete(null), Math.max(0, entry.deadline - Date.now()));
      const settle = () => {
        if (disposed || interaction.id !== undefined) return;
        if (Date.now() >= entry.deadline) { interaction.complete(null); return; }
        // Reuse an in-flight/result promise across effect reruns. Only failed
        // attempts retry, always with this deliberate selection's original ID.
        entry.settlement ??= fetch("/api/search", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, request_id: requestId, search_mode: "settled" }),
        }).then(async response => {
          if (response.status >= 400 && response.status < 500 && response.status !== 429) return null;
          if (!response.ok) throw new Error("Search settlement failed");
          return (await response.json()).interaction_id as string | null | undefined;
        });
        void entry.settlement.then(id => {
          if (disposed) return;
          clearTimeout(expiry);
          interaction.complete(Date.now() < entry.deadline ? id : null);
        }).catch(() => {
          if (disposed) return;
          entry.settlement = undefined;
          if (Date.now() < entry.deadline) retry = setTimeout(settle, 1_000);
          else interaction.complete(null);
        });
      };
      settle();
      return () => { disposed = true; clearTimeout(retry); clearTimeout(expiry); };
    }
    if (answerRequestId && !interactionId) {
      const interaction = current.current.open.interaction;
      const read = () => {
        try {
          const value = JSON.parse(localStorage.getItem(`bold:interaction:${answerRequestId}`) || "null");
          if (value && Date.now() - value.at < 30_000) interaction.complete(value.id);
        } catch { /* Unavailable storage leaves the open unattributed. */ }
      };
      read();
      window.addEventListener("storage", read);
      window.addEventListener("bold:interaction", read);
      const cleanup = () => {
        window.removeEventListener("storage", read);
        window.removeEventListener("bold:interaction", read);
      };
      const timer = setTimeout(cleanup, 30_000);
      return () => { clearTimeout(timer); cleanup(); };
    }
  }, [key, videoId, interactionId, query, requestId, answerRequestId]);

  return open;
}
