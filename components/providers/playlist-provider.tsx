"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface PlaylistContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
  hasPlaylist: boolean;
  setHasPlaylist: (hasPlaylist: boolean) => void;
}

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

export function PlaylistProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasPlaylist, setHasPlaylist] = useState(false);

  const toggle = () => setIsOpen(!isOpen);

  return (
    <PlaylistContext.Provider value={{ isOpen, setIsOpen, toggle, hasPlaylist, setHasPlaylist }}>
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
