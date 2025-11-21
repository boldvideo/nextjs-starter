"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/providers/sidebar-provider";

interface SidebarProps {
  side: "left" | "right";
  mode?: "toggle" | "collapse";
  className?: string;
  children: React.ReactNode;
}

export const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  ({ side, mode = "toggle", className, children }, ref) => {
    const sidebar = useSidebar();
    const sidebarState = side === "left" ? sidebar.left : sidebar.right;
    const { isOpen, isCollapsed } = sidebarState;

    // Determine visibility and width
    const isVisible = mode === "toggle" ? isOpen : true;
    // Fixed widths: 320px (w-80) open, 56px (w-14) collapsed
    const width = mode === "collapse" && isCollapsed ? "w-14" : "w-80"; 

    // Desktop vs Mobile positioning
    const positionClasses =
      side === "left"
        ? "left-0 lg:left-0" // Always left-aligned
        : "right-0 lg:right-0"; // Always right-aligned

    return (
      <>
        {/* Mobile Backdrop */}
        {sidebar.isMobile && isOpen && (
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={side === "left" ? sidebar.toggleLeft : sidebar.toggleRight}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <aside
          ref={ref}
          data-sidebar
          data-side={side}
          data-mode={mode}
          data-state={isOpen ? "open" : "closed"}
          data-collapsed={mode === "collapse" && isCollapsed ? "true" : "false"}
          className={cn(
            // Base
            "flex flex-col transition-all duration-300 ease-in-out bg-sidebar text-sidebar-foreground border-sidebar-border",

            // Mobile: Fixed Drawer
            sidebar.isMobile && [
              "fixed inset-y-0 z-50 w-full sm:max-w-sm",
              isOpen ? "translate-x-0" : side === "left" ? "-translate-x-full" : "translate-x-full",
            ],

            // Desktop: Fixed Sidebar (App-Shell style)
            !sidebar.isMobile && [
              "fixed bottom-0 z-30 bg-background", // Fixed, anchored bottom
              "top-[var(--header-height)]", // Matches standard header height
              width,
              side === "right" && "right-0 border-l",
              side === "left" && "left-0 border-r",
            ],

            // Position for Mobile (or if fixed is forced)
            sidebar.isMobile && positionClasses,

            // Visibility (toggle mode only) - hiding on desktop via display:none removes it from flex flow
            !isVisible && !sidebar.isMobile && "hidden",

            className
          )}
        >
          {/* No inner sticky wrapper needed for fixed sidebar */}
          {children}
        </aside>
      </>
    );
  }
);

Sidebar.displayName = "Sidebar";
