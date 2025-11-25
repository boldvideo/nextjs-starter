"use client";

import * as React from "react";
import { 
  PanelLeftClose, 
  PanelLeftOpen, 
  PanelRightClose, 
  PanelRightOpen,
  X 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/providers/sidebar-provider";

interface SidebarToggleProps {
  side: "left" | "right";
  mode?: "toggle" | "collapse";
  className?: string;
}

export function SidebarToggle({ side, mode = "toggle", className }: SidebarToggleProps) {
  const sidebar = useSidebar();
  const state = side === "left" ? sidebar.left : sidebar.right;
  
  const handleClick = () => {
    if (sidebar.isMobile) {
      // Mobile: always toggle open/close
      if (side === "left") {
        sidebar.toggleLeft();
      } else {
        sidebar.toggleRight();
      }
    } else {
      // Desktop
      if (mode === "collapse") {
        // Toggle collapse state
        const setCollapsed = side === "left" ? sidebar.setLeftCollapsed : sidebar.setRightCollapsed;
        setCollapsed(!state.isCollapsed);
      } else {
        // Toggle open state
        if (side === "left") {
          sidebar.toggleLeft();
        } else {
          sidebar.toggleRight();
        }
      }
    }
  };

  // Icon selection
  const Icon = React.useMemo(() => {
    if (sidebar.isMobile) return X;

    if (side === "left") {
      // If collapsed, show Open icon (to expand). If open (not collapsed), show Close icon (to collapse)
      // For toggle mode: if open, show Close. If closed, this button might not be visible inside sidebar?
      // Usually toggle buttons live outside or inside. Assuming inside header for now.
      return state.isCollapsed ? PanelLeftOpen : PanelLeftClose;
    } else {
      return state.isCollapsed ? PanelRightOpen : PanelRightClose;
    }
  }, [side, state.isCollapsed, sidebar.isMobile]);

  return (
    <button
      onClick={handleClick}
      className={cn(
        "p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors",
        className
      )}
      aria-label={state.isOpen ? "Close sidebar" : "Open sidebar"}
      type="button"
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}
