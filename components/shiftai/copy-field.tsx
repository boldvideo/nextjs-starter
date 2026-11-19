"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { track } from "@/lib/shiftai/track";

/** A value to paste somewhere else: the whole row copies it. */
export function CopyField({ value, label, what }: { value: string; label: string; what: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          track("Connect copy", { what });
          window.setTimeout(() => setCopied(false), 1800);
        });
      }}
      aria-label={`Copy ${label}`}
      className="group flex w-full items-center gap-4 border border-border bg-background px-4 py-3.5 text-left transition-colors hover:border-acid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid"
    >
      <span className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[14px] text-foreground [scrollbar-width:none]">{value}</span>
      <span className="sx-label flex shrink-0 items-center gap-2 !text-[10px] text-muted-foreground transition-colors group-hover:text-acid" aria-live="polite">
        {copied ? <Check className="h-3.5 w-3.5 text-acid" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </span>
    </button>
  );
}
