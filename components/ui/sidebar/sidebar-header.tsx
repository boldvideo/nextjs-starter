"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SidebarHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export const SidebarHeader = React.forwardRef<HTMLDivElement, SidebarHeaderProps>(
  ({ className, children }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex-shrink-0 border-b border-sidebar-border p-4",
          "flex items-center justify-between h-16", // Fixed height for consistency
          className
        )}
      >
        {children}
      </div>
    );
  }
);

SidebarHeader.displayName = "SidebarHeader";
