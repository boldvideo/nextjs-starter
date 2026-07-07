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
    router.push("/ask");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex items-center gap-2 h-[34px] pl-2.5 pr-3 rounded-lg",
        "border border-border bg-muted",
        "text-sm font-medium text-muted-foreground",
        "hover:text-foreground hover:border-muted-foreground/40",
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
