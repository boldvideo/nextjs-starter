"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { AskPlayground } from "@/components/playground/ask-playground";
import { SearchPlayground } from "@/components/playground/search-playground";
import { RecommendationsPlayground } from "@/components/playground/recommendations-playground";

type Tab = "ask" | "search" | "recommendations";

const tabs: { id: Tab; label: string }[] = [
  { id: "ask", label: "Ask" },
  { id: "search", label: "Search" },
  { id: "recommendations", label: "Recommendations" },
];

export default function PlaygroundPage() {
  const [activeTab, setActiveTab] = useState<Tab>("ask");

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              "border-b-2 -mb-px",
              activeTab === tab.id
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-zinc-400 hover:text-zinc-100"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "ask" && <AskPlayground />}
        {activeTab === "search" && <SearchPlayground />}
        {activeTab === "recommendations" && <RecommendationsPlayground />}
      </div>
    </div>
  );
}
