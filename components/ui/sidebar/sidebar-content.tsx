"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SidebarContentProps {
  className?: string;
  children: React.ReactNode;
  // Support data attributes for styling based on parent state
  "data-collapsed"?: boolean;
}

export const SidebarContent = React.forwardRef<HTMLDivElement, SidebarContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

SidebarContent.displayName = "SidebarContent";
