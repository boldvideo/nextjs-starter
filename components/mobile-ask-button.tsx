"use client";

import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

export function MobileAskButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push("/ask")}
      className="flex items-center justify-center gap-1.5 h-11 px-2 -my-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
      aria-label="Ask AI"
    >
      <Sparkles className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium">Ask</span>
    </button>
  );
}
