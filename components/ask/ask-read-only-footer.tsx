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
 * this is just a slim handoff bar sitting where the input would be:
 * Taki offering the marker so you ask your own.
 */
export function AskReadOnlyFooter({ onStartNew }: AskReadOnlyFooterProps) {
  const settings = useSettings();
  const config = getPortalConfig(settings);

  return (
    <div className="flex-shrink-0 border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto w-full max-w-3xl px-4 py-3 md:px-6">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-2.5 shadow-[0_1px_3px_rgba(22,21,15,0.06)]">
          <PersonaAvatar
            name={config.ai.name}
            avatar={config.ai.avatar}
            size={30}
            className="shrink-0 ring-2 ring-accent"
          />
          <p className="min-w-0 flex-1 truncate">
            <span className="font-scribble text-[17px] text-foreground/75">
              this convo&rsquo;s wrapped —
            </span>{" "}
            <span className="hidden text-sm text-muted-foreground sm:inline">
              grab the marker and ask your own
            </span>
          </p>
          <button
            onClick={onStartNew}
            className="font-marker shrink-0 cursor-pointer rounded-xl bg-accent px-4 py-2 text-[14px] text-accent-foreground shadow-[0_2px_0_rgba(22,21,15,0.25)] transition-all hover:-translate-y-px hover:shadow-[0_3px_0_rgba(22,21,15,0.25)] active:translate-y-0 active:shadow-none"
          >
            ASK YOURS
          </button>
        </div>
      </div>
    </div>
  );
}
