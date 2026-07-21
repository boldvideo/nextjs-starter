"use client";

import { useSettings } from "@/components/providers/settings-provider";
import { getPortalConfig } from "@/lib/portal-config";
import { PersonaAvatar } from "@/components/persona-avatar";

interface AskReadOnlyFooterProps {
  onStartNew: () => void;
  /** Kept for API compatibility — the handoff leads to /ask, where the
      conversation starters already live. */
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
}

/**
 * Deep-linked past conversations are read-only. The answer owns the page —
 * this is just a slim handoff bar sitting where the input would be,
 * pointing at a fresh request.
 */
export function AskReadOnlyFooter({ onStartNew }: AskReadOnlyFooterProps) {
  const settings = useSettings();
  const config = getPortalConfig(settings);

  return (
    <div className="flex-shrink-0 border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto w-full max-w-3xl px-4 py-3 md:px-6">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3.5 py-2.5 shadow-[0_1px_3px_var(--shadow)]">
          <PersonaAvatar
            name={config.ai.name}
            avatar={config.ai.avatar}
            size={30}
            className="shrink-0"
          />
          <p className="min-w-0 flex-1 truncate">
            <span className="text-[14px] text-muted-foreground">
              That&rsquo;s a wrap on this one —
            </span>{" "}
            <span className="hidden text-sm text-muted-foreground sm:inline">
              ask the desk something new
            </span>
          </p>
          <button
            onClick={onStartNew}
            className="font-heading font-semibold shrink-0 cursor-pointer rounded-[6px] bg-accent px-4 py-2 text-[14px] text-[#09090b] transition-colors hover:bg-[var(--accent-hover)]"
          >
            New Request
          </button>
        </div>
      </div>
    </div>
  );
}
