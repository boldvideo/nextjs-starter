"use client";

import { useState, useEffect } from 'react';
import { Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  isProgressTrackingEnabled,
  setProgressTrackingEnabled,
} from '@/lib/progress/preferences';

interface ProgressToggleProps {
  className?: string;
}

/**
 * Toggle button for progress tracking preference
 * Similar pattern to AutoplayToggle
 */
export function ProgressToggle({ className }: ProgressToggleProps) {
  const [isEnabled, setIsEnabled] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
    setIsEnabled(isProgressTrackingEnabled());
  }, []);

  const handleToggle = () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    setProgressTrackingEnabled(newValue);

    // Optionally broadcast change to other tabs
    if (typeof window !== 'undefined') {
      localStorage.setItem('bold-progress-toggle-sync', Date.now().toString());
    }
  };

  // Listen for changes from other tabs
  useEffect(() => {
    if (!mounted) return;

    const handleStorageChange = () => {
      setIsEnabled(isProgressTrackingEnabled());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [mounted]);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return <div className="w-8 h-8" />; // Placeholder
  }

  return (
    <button
      onClick={handleToggle}
      className={cn(
        'p-2 rounded-md transition-all duration-200',
        'hover:bg-accent',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        isEnabled
          ? 'text-primary bg-primary/10'
          : 'text-muted-foreground',
        className
      )}
      aria-label={isEnabled ? 'Disable progress tracking' : 'Enable progress tracking'}
      title={isEnabled ? 'Remember progress enabled' : 'Remember progress disabled'}
    >
      <Repeat
        className={cn(
          'w-5 h-5 transition-transform duration-200',
          isEnabled && 'scale-110'
        )}
      />
    </button>
  );
}
