"use client";

import { useState } from "react";
import { Check, Send } from "lucide-react";
import { track } from "@/lib/gym-track";

/**
 * "Send to my co-founder": the native share sheet on phones, else copy the
 * link. The link previews as the Playbook cover (./og).
 */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.href.split("#")[0];
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ url, title });
        track("Playbook shared", { via: "native" });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      track("Playbook shared", { via: "copy" });
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* dismissed or blocked */
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className="no-print inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-semibold cursor-pointer transition-colors border-2 border-[#f6f0ff]/40 bg-transparent text-[#f6f0ff] hover:bg-[#f6f0ff] hover:text-[#0b0618] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cyan)]"
    >
      {copied ? <Check className="h-4 w-4" strokeWidth={3} /> : <Send className="h-4 w-4" />}
      {copied ? "Link copied" : "Send to my co-founder"}
    </button>
  );
}
