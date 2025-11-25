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
    
    const DEFAULT_RIGHT_WIDTH = 380;
    const MAX_RIGHT_WIDTH = 640;

    // Width configuration
    // Left: Fixed classes
    // Right: Dynamic style (CSS variable)
    const widthClass = side === "left" 
      ? (mode === "collapse" && isCollapsed ? "w-14" : "w-80")
      : undefined;

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
          style={{
            ...(side === "right" && !sidebar.isMobile ? { width: "var(--sidebar-right-width)" } : {}),
          }}
          className={cn(
            // Base
            "flex flex-col bg-sidebar text-sidebar-foreground border-sidebar-border",

            // Mobile: Fixed Drawer
            sidebar.isMobile && [
              "fixed inset-y-0 z-50 w-full sm:max-w-sm",
              isOpen ? "translate-x-0" : side === "left" ? "-translate-x-full" : "translate-x-full",
            ],

            // Desktop: Fixed Sidebar (App-Shell style)
            !sidebar.isMobile && [
              "fixed bottom-0 z-30 bg-background", // Fixed, anchored bottom
              "top-[var(--header-height)]", // Matches standard header height
              widthClass,
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
          {/* Resize Handle for Right Sidebar */}
          {side === "right" && !sidebar.isMobile && !isCollapsed && (
            <div
              className="absolute left-0 top-0 bottom-0 w-4 cursor-col-resize z-50 group flex items-center justify-center -translate-x-1/2"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const startX = e.clientX;
                const startWidth = sidebarState.width ?? DEFAULT_RIGHT_WIDTH;
                const wrapper = document.querySelector("[data-sidebar-wrapper]") as HTMLElement;
                
                // Add a global cursor override to body to ensure cursor stays consistent
                document.body.style.cursor = "col-resize";
                
                // Disable pointer events on iframes or heavy content during drag if needed
                // but for now just simple drag

                const onMouseMove = (moveEvent: MouseEvent) => {
                  const delta = startX - moveEvent.clientX; // Moving left increases width
                  const newWidth = Math.min(Math.max(startWidth + delta, 280), MAX_RIGHT_WIDTH);
                  
                  if (wrapper) {
                    wrapper.style.setProperty("--sidebar-right-width", `${newWidth}px`);
                  }
                };

                const onMouseUp = (upEvent: MouseEvent) => {
                  const delta = startX - upEvent.clientX;
                  const newWidth = Math.min(Math.max(startWidth + delta, 280), MAX_RIGHT_WIDTH);
                  
                  sidebar.setRightWidth(newWidth);
                  
                  // Do NOT remove the property here. 
                  // We want to keep the visual state stable until React catches up and overwrites it.
                  // Removing it causes a flash of "auto" width (jumps to content width).
                  
                  document.body.style.cursor = "";
                  document.removeEventListener("mousemove", onMouseMove);
                  document.removeEventListener("mouseup", onMouseUp);
                };

                document.addEventListener("mousemove", onMouseMove);
                document.addEventListener("mouseup", onMouseUp);
              }}
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const currentWidth = sidebarState.width ?? DEFAULT_RIGHT_WIDTH;

                // Toggle: if near max, go to default; otherwise max
                if (currentWidth >= MAX_RIGHT_WIDTH - 5) {
                  sidebar.setRightWidth(DEFAULT_RIGHT_WIDTH);
                } else {
                  sidebar.setRightWidth(MAX_RIGHT_WIDTH);
                }
              }}
            >
               {/* Visual handle line that appears on hover */}
               <div className="w-1 h-12 rounded-full bg-border group-hover:bg-primary transition-colors" />
            </div>
          )}
        </aside>
      </>
    );
  }
);

Sidebar.displayName = "Sidebar";
