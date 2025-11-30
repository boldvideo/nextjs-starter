"use client";

import { cn } from "@/lib/utils";

interface PillTabProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

export function PillTab({ active, onClick, children, className }: PillTabProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground hover:bg-muted/80",
        className
      )}
    >
      {children}
    </button>
  );
}

interface PillTabsProps {
  children: React.ReactNode;
  className?: string;
}

export function PillTabs({ children, className }: PillTabsProps) {
  return (
    <div className={cn("flex items-center gap-2 overflow-x-auto no-scrollbar", className)}>
      {children}
    </div>
  );
}
