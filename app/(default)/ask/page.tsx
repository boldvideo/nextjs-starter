"use client";

import { Suspense } from "react";
import { AskPageContent } from "@/components/ask/ask-page-content";

function AskPageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

export default function AskPage() {
  return (
    <Suspense fallback={<AskPageLoading />}>
      <AskPageContent />
    </Suspense>
  );
}
