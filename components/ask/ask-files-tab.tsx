"use client";

import { FileText } from "lucide-react";

export function AskFilesTab() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <FileText className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">Files Coming Soon</h3>
      <p className="text-sm text-muted-foreground max-w-md">
        PDF and document indexing is not yet available. When enabled, you&apos;ll see
        related files and documents here.
      </p>
    </div>
  );
}
