"use client";

import { usePathname } from "next/navigation";
import { AskPageContent } from "./ask-page-content";

/**
 * Mounted once by app/(default)/ask/layout.tsx so the thread survives the
 * /ask → /ask/<id> URL flip (and any router refresh after it). As separate
 * pages, that flip remounted the thread as a deep link: loader, refetch,
 * and the in-flight answer thrown away.
 */
export function AskShell() {
  const pathname = usePathname();
  const conversationId = pathname?.match(/^\/ask\/([^/?#]+)/)?.[1];
  return <AskPageContent conversationId={conversationId} />;
}
