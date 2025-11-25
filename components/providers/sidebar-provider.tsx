"use client";

import * as React from "react";

// Constants
const STORAGE_KEY = "bold-sidebar-state-v1";
const MOBILE_BREAKPOINT = 768; // Mobile uses bottom nav, desktop uses sidebars

// Types
interface SidebarSideState {
  isOpen: boolean;
  isCollapsed: boolean;
  width?: number;
}

interface SidebarState {
  left: SidebarSideState;
  right: SidebarSideState;
  isMobile: boolean;
}

interface SidebarContextValue extends SidebarState {
  // Actions
  toggleLeft: () => void;
  toggleRight: () => void;
  setLeftOpen: (open: boolean) => void;
  setRightOpen: (open: boolean) => void;
  setLeftCollapsed: (collapsed: boolean) => void;
  setRightCollapsed: (collapsed: boolean) => void;
  setRightWidth: (width: number) => void;
  
  // Legacy API compatibility (maps to left sidebar)
  /** @deprecated Use toggleLeft() instead */
  toggle: () => void;
  /** @deprecated Use left.isOpen instead */
  isOpen: boolean;
  /** @deprecated Use setLeftOpen instead */
  setOpen: (open: boolean) => void;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

interface StoredState {
  left: SidebarSideState;
  right: SidebarSideState;
}

export function SidebarProvider({
  children,
  defaultOpen = true,
}: SidebarProviderProps) {
  // Initial state (server-safe defaults)
  // Default: Left open on desktop, closed on mobile. Right closed.
  const [state, setState] = React.useState<SidebarState>({
    left: { isOpen: defaultOpen, isCollapsed: false },
    right: { isOpen: false, isCollapsed: false, width: 380 },
    isMobile: false, // Assume desktop first for SSR
  });

  // Track if we've hydrated from storage to avoid overwriting with defaults
  const [isHydrated, setIsHydrated] = React.useState(false);

  // 1. Hydrate from sessionStorage (Client only)
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    // Check mobile status immediately on mount
    const isMobileNow = window.innerWidth < MOBILE_BREAKPOINT;
    
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: StoredState = JSON.parse(stored);
        setState({
          left: parsed.left,
          right: parsed.right,
          isMobile: isMobileNow,
        });
      } else {
        // No storage, just set mobile state correctly
        setState(prev => ({
          ...prev,
          isMobile: isMobileNow,
          // If mobile, force closed initially
          left: isMobileNow ? { ...prev.left, isOpen: false } : prev.left,
          right: isMobileNow ? { ...prev.right, isOpen: false } : prev.right,
        }));
      }
    } catch (e) {
      console.warn("Failed to hydrate sidebar state:", e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // 2. Handle Mobile Detection & Auto-closing
  // We check for resize events to update isMobile
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      const width = window.innerWidth;
      const isMobileNow = width < MOBILE_BREAKPOINT;

      setState((prev) => {
        if (prev.isMobile === isMobileNow) return prev;

        // Transitioning Desktop -> Mobile: Close everything
        if (!prev.isMobile && isMobileNow) {
          return {
            ...prev,
            isMobile: isMobileNow,
            left: { ...prev.left, isOpen: false },
            right: { ...prev.right, isOpen: false },
          };
        }
        
        // Transitioning Mobile -> Desktop: Keep state or restore? 
        // For now, just update isMobile flag
        return {
          ...prev,
          isMobile: isMobileNow,
        };
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 3. Persist to sessionStorage
  React.useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;

    const toStore: StoredState = {
      left: state.left,
      right: state.right,
    };

    // Debounce to avoid thrashing storage
    const timeoutId = setTimeout(() => {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
      } catch (e) {
        console.warn("Failed to save sidebar state:", e);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [state.left, state.right, isHydrated]);

  // Actions
  const toggleLeft = React.useCallback(() => {
    setState((prev) => {
      const nextIsOpen = !prev.left.isOpen;
      return {
        ...prev,
        left: { ...prev.left, isOpen: nextIsOpen },
        // On mobile, exclusive mode (close right if opening left)
        right: (prev.isMobile && nextIsOpen) 
          ? { ...prev.right, isOpen: false } 
          : prev.right
      };
    });
  }, []);

  const toggleRight = React.useCallback(() => {
    setState((prev) => {
      const nextIsOpen = !prev.right.isOpen;
      return {
        ...prev,
        right: { ...prev.right, isOpen: nextIsOpen },
        // On mobile, exclusive mode (close left if opening right)
        left: (prev.isMobile && nextIsOpen) 
          ? { ...prev.left, isOpen: false } 
          : prev.left
      };
    });
  }, []);

  const setLeftOpen = React.useCallback((open: boolean) => {
    setState((prev) => ({
      ...prev,
      left: { ...prev.left, isOpen: open },
      right: (prev.isMobile && open) ? { ...prev.right, isOpen: false } : prev.right
    }));
  }, []);

  const setRightOpen = React.useCallback((open: boolean) => {
    setState((prev) => ({
      ...prev,
      right: { ...prev.right, isOpen: open },
      left: (prev.isMobile && open) ? { ...prev.left, isOpen: false } : prev.left
    }));
  }, []);

  const setLeftCollapsed = React.useCallback((collapsed: boolean) => {
    setState((prev) => ({
      ...prev,
      left: { ...prev.left, isCollapsed: collapsed },
    }));
  }, []);

  const setRightCollapsed = React.useCallback((collapsed: boolean) => {
    setState((prev) => ({
      ...prev,
      right: { ...prev.right, isCollapsed: collapsed },
    }));
  }, []);

  const setRightWidth = React.useCallback((width: number) => {
    setState((prev) => ({
      ...prev,
      right: { ...prev.right, width },
    }));
  }, []);

  // Legacy wrappers
  const legacyToggle = toggleLeft;
  const legacySetOpen = setLeftOpen;

  // Memoize context value
  const value = React.useMemo(
    () => ({
      ...state,
      toggleLeft,
      toggleRight,
      setLeftOpen,
      setRightOpen,
      setLeftCollapsed,
      setRightCollapsed,
      setRightWidth,
      // Legacy
      isOpen: state.left.isOpen,
      toggle: legacyToggle,
      setOpen: legacySetOpen,
    }),
    [
      state,
      toggleLeft,
      toggleRight,
      setLeftOpen,
      setRightOpen,
      setLeftCollapsed,
      setRightCollapsed,
      legacyToggle,
      legacySetOpen,
      setRightWidth,
    ]
  );

  // Calculate widths for CSS variables
  const leftWidth = state.left.isOpen 
    ? state.left.isCollapsed ? "56px" : "320px"
    : state.left.isCollapsed 
    ? "56px" 
    : "0px";

  const rightWidth = state.right.isOpen 
    ? state.right.isCollapsed ? "56px" : `${state.right.width ?? 380}px`
    : state.right.isCollapsed 
    ? "56px" 
    : "0px";

  return (
    <SidebarContext.Provider value={value}>
      <div
        data-sidebar-wrapper
        className="flex flex-col flex-1 min-h-0"
        style={
          {
            "--sidebar-left-width": leftWidth,
            "--sidebar-right-width": rightWidth,
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
