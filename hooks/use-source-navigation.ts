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
  const current = useRef<{ key: string; open: SourceOpen } | null>(null);
  const [open, setOpen] = useState<SourceOpen>();

  useEffect(() => {
    if (!isSearchRequestId(interactionId) && !isSearchRequestId(answerRequestId) && !(query && isSearchRequestId(requestId))) {
      current.current = null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronize navigation with its external playback lifetime
      setOpen(undefined);
      return;
    }
    if (current.current?.key !== key) {
      const interaction = new AnswerInteraction(isSearchRequestId(interactionId) ? interactionId : undefined);
      current.current = { key, open: new SourceOpen(videoId, interaction) };
      if (!interaction.id && !answerRequestId) {
        // Sole settlement owner for a preview selection, including new-tab opens.
        void fetch("/api/search", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, request_id: requestId, search_mode: "settled" }),
        }).then(async response => {
          if (!response.ok) throw new Error("Search settlement failed");
          interaction.complete((await response.json()).interaction_id);
        }).catch(() => interaction.complete(null));
      }
    }
    setOpen(current.current.open);
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
