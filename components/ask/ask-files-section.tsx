"use client";

import { FileText, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface MockFile {
  id: string;
  name: string;
  type: string;
  size: string;
}

interface AskFilesSectionProps {
  className?: string;
}

const mockFiles: MockFile[] = [
  { id: "1", name: "Company Valuation Guide.pdf", type: "PDF", size: "2.4 MB" },
  { id: "2", name: "M&A Process Overview.docx", type: "DOCX", size: "856 KB" },
  { id: "3", name: "Due Diligence Checklist.xlsx", type: "XLSX", size: "124 KB" },
];

export function AskFilesSection({ className }: AskFilesSectionProps) {
  if (mockFiles.length === 0) {
    return null;
  }

  return (
    <div className={cn("w-full", className)}>
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
        Related Files
      </h3>
      <div className="space-y-0 divide-y divide-border border-t border-b border-border">
        {mockFiles.map((file) => (
          <button
            key={file.id}
            className={cn(
              "w-full flex items-center gap-3 py-3 text-left",
              "text-sm text-foreground hover:text-primary transition-colors group"
            )}
          >
            <div className="flex-shrink-0 w-8 h-8 rounded bg-muted flex items-center justify-center">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {file.type} • {file.size}
              </p>
            </div>
            <Download className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
    </div>
  );
}
