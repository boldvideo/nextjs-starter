"use client";

import { useSettings } from "@/components/providers/settings-provider";

interface AskHeaderProps {
  query?: string;
}

export function AskHeader({ query }: AskHeaderProps) {
  const settings = useSettings() as any;
  const aiName = settings?.ai_name || "AI";

  return (
    <h1 className="text-4xl font-bold mb-2">
      {query ? `Ask ${aiName}` : "Ask a Question"}
    </h1>
  );
}