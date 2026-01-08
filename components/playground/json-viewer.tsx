"use client";

import { JsonView, darkStyles } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import { cn } from "@/lib/utils";

interface JsonViewerProps {
  data: unknown;
  className?: string;
}

export function JsonViewer({ data, className }: JsonViewerProps) {
  return (
    <div className={cn("text-xs", className)}>
      <JsonView data={data as object} style={darkStyles} />
    </div>
  );
}
