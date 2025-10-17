"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface PlaylistContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
  hasPlaylist: boolean;
  setHasPlaylist: (hasPlaylist: boolean) => void;
  isAutoplay: boolean;
  setAutoplay: (enabled: boolean) => void;
  toggleAutoplay: () => void;
}

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

const AUTOPLAY_STORAGE_KEY = 'bold-autoplay';
const LEGACY_STORAGE_KEY = 'bold-continuous-play'; // For migration

export function PlaylistProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasPlaylist, setHasPlaylist] = useState(false);

  // Initialize from localStorage (client-side only)
  const [isAutoplay, setIsAutoplay] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Handle hydration and load from localStorage with migration
  useEffect(() => {
    setMounted(true);

    // Try new key first
    let stored = localStorage.getItem(AUTOPLAY_STORAGE_KEY);

    // Migrate from old key if new key doesn't exist
    if (stored === null) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy !== null) {
        stored = legacy;
        localStorage.setItem(AUTOPLAY_STORAGE_KEY, legacy);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    }

    if (stored !== null) {
      setIsAutoplay(stored === 'true');
    }
  }, []);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(AUTOPLAY_STORAGE_KEY, String(isAutoplay));
    }
  }, [isAutoplay, mounted]);

  const toggle = () => setIsOpen(!isOpen);

  const setAutoplayFn = (enabled: boolean) => {
    setIsAutoplay(enabled);
  };

  const toggleAutoplay = () => {
    setIsAutoplay(prev => !prev);
  };

  return (
    <PlaylistContext.Provider value={{
      isOpen,
      setIsOpen,
      toggle,
      hasPlaylist,
      setHasPlaylist,
      isAutoplay,
      setAutoplay: setAutoplayFn,
      toggleAutoplay,
    }}>
      {children}
    </PlaylistContext.Provider>
  );
}

export function usePlaylist() {
  const context = useContext(PlaylistContext);
  if (context === undefined) {
    throw new Error("usePlaylist must be used within a PlaylistProvider");
  }
  return context;
}
