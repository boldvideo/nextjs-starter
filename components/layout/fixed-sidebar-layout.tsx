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
    <div className="flex-1 min-h-0 relative flex flex-col isolate" data-sidebar-wrapper>
      {leftSidebar}
      <div
        className="flex-1 min-w-0 w-full pt-0 lg:pt-5 transition-all flex flex-col min-h-0"
        style={
          {
            "--padding-left-desktop": hasLeft
              ? "calc(var(--sidebar-left-width) + 20px)"
              : "20px",
            "--padding-right-desktop": hasRight
              ? "calc(var(--sidebar-right-width) + 20px)"
              : "20px",
          } as React.CSSProperties
        }
      >
        <div className="w-full lg:pl-[var(--padding-left-desktop)] lg:pr-[var(--padding-right-desktop)] transition-[padding] flex-1 flex flex-col min-h-0">
          <div className={cn("mx-auto w-full flex-1 flex flex-col min-h-0", className)}>
            {children}
          </div>
        </div>
      </div>
      {rightSidebar}
    </div>
  );
}
