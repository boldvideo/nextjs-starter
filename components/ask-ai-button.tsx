"use client";

import { useRouter } from "next/navigation";
import { askLabel, cn } from "@/lib/utils";
import { PersonaAvatar } from "@/components/persona-avatar";

interface AskAiButtonProps {
  personaName: string;
  personaAvatar?: string;
  className?: string;
}

export function AskAiButton({
  personaName,
  personaAvatar,
  className,
}: AskAiButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    // Always start fresh: if the ask page is already mounted with a
    // conversation, tell it to reset (URL updates via replaceState don't
    // remount it).
    window.dispatchEvent(new CustomEvent("bold:ask-new-chat"));
    router.push("/ask", { scroll: false });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex shrink-0 items-center gap-2 h-[34px] pl-2.5 pr-3 rounded-lg",
        "border border-border bg-muted",
        "text-sm font-medium text-muted-foreground",
        "hover:text-primary hover:border-primary",
        "transition-colors cursor-pointer",
        className
      )}
    >
      <PersonaAvatar name={personaName} avatar={personaAvatar} size={20} />
      <span className="whitespace-nowrap">
        <span className="md:hidden">Ask</span>
        <span className="hidden md:inline">{askLabel(personaName)}</span>
      </span>
    </button>
  );
}
