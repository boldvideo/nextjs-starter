"use client";

import { signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import type { Session } from "next-auth";
import { LogOut, User } from "lucide-react";
import Image from "next/image";

interface UserMenuProps {
  session: Session | null;
}

export default function UserMenu({ session }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // In development mode, show mock user if no session
  let displaySession = session;
  if (process.env.NODE_ENV === "development" && !session) {
    displaySession = {
      user: {
        name: "Developer",
        email: "developer@example.com",
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    } as Session;
  }

  if (!displaySession?.user) {
    return null;
  }

  const userInitial = displaySession.user.name?.[0]?.toUpperCase() || displaySession.user.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="relative" ref={menuRef}>
      {/* User Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        aria-label="User menu"
      >
        {displaySession.user.image ? (
          <Image
            src={displaySession.user.image}
            alt={displaySession.user.name || "User"}
            className="w-8 h-8 rounded-full"
            width={32}
            height={32}
          />
        ) : (
          <span className="text-sm font-semibold">{userInitial}</span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-popover border border-border animate-in fade-in-0 zoom-in-95">
          <div className="p-2">
            {/* User Info */}
            <div className="px-3 py-2 border-b border-border">
              <p className="text-sm font-medium truncate">
                {displaySession.user.name || "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {displaySession.user.email}
              </p>
            </div>

            {/* Menu Items */}
            <div className="mt-1">
              <button
                onClick={() => signOut()}
                className="w-full flex items-center px-3 py-2 text-sm rounded hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}