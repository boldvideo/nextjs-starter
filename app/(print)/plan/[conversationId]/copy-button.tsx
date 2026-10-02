"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { track } from "@/lib/gym-track";

/** Copies plain text (the words, or the whole playbook) and says so. */
export function CopyButton({ text, label, className }: { text: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      track("Words copied", { from: label });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "no-print inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-semibold cursor-pointer transition-colors",
        "border-2 border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cyan)]",
        className
      )}
    >
      {copied ? <Check className="h-4 w-4" strokeWidth={3} /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied" : label}
    </button>
  );
}
