"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface PlaylistContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
  hasPlaylist: boolean;
  setHasPlaylist: (hasPlaylist: boolean) => void;
  isContinuousPlay: boolean;
  setContinuousPlay: (enabled: boolean) => void;
  toggleContinuousPlay: () => void;
}

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

const CONTINUOUS_PLAY_STORAGE_KEY = 'bold-continuous-play';

export function PlaylistProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasPlaylist, setHasPlaylist] = useState(false);

  // Initialize from localStorage (client-side only)
  const [isContinuousPlay, setIsContinuousPlay] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Handle hydration and load from localStorage
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(CONTINUOUS_PLAY_STORAGE_KEY);
    if (stored !== null) {
      setIsContinuousPlay(stored === 'true');
    }
  }, []);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(CONTINUOUS_PLAY_STORAGE_KEY, String(isContinuousPlay));
    }
  }, [isContinuousPlay, mounted]);

  const toggle = () => setIsOpen(!isOpen);

  const setContinuousPlay = (enabled: boolean) => {
    setIsContinuousPlay(enabled);
  };

  const toggleContinuousPlay = () => {
    setIsContinuousPlay(prev => !prev);
  };

  return (
    <PlaylistContext.Provider value={{
      isOpen,
      setIsOpen,
      toggle,
      hasPlaylist,
      setHasPlaylist,
      isContinuousPlay,
      setContinuousPlay,
      toggleContinuousPlay,
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
