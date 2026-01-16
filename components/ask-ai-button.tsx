"use client";

import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AskAiButtonProps {
  personaName: string;
  className?: string;
}

export function AskAiButton({ personaName, className }: AskAiButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push("/ask");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "relative flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md",
        "text-foreground hover:bg-muted/50 transition-colors duration-200",
        "cursor-pointer",
        className
      )}
    >
      <Sparkles className="h-4 w-4 text-primary" />
      <span className="whitespace-nowrap bg-gradient-to-r from-foreground via-muted-foreground to-foreground bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer-text">
        <span className="md:hidden">Ask</span>
        <span className="hidden md:inline">{personaName}</span>
      </span>
    </button>
  );
}
