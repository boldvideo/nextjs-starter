"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FixedSidebarLayoutProps {
  leftSidebar?: ReactNode;
  rightSidebar?: ReactNode;
  children: ReactNode;
  className?: string; // for the inner max-width container if needed
}

export function FixedSidebarLayout({
  leftSidebar,
  rightSidebar,
  children,
  className,
}: FixedSidebarLayoutProps) {
  const hasLeft = !!leftSidebar;
  const hasRight = !!rightSidebar;

  return (
    <div className="min-h-full relative">
      {leftSidebar}
      <div
        className="flex-1 min-w-0 w-full pt-5"
        style={{
          paddingLeft: hasLeft
            ? "calc(var(--sidebar-left-width) + 20px)"
            : "20px",
          paddingRight: hasRight
            ? "calc(var(--sidebar-right-width) + 20px)"
            : "20px",
        }}
      >
        <div className={cn("mx-auto", className)}>{children}</div>
      </div>
      {rightSidebar}
    </div>
  );
}
