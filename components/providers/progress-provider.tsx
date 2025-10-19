"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSettings } from './settings-provider';
import { getTenantId } from '@/lib/progress/tenant';
import { getAllProgress } from '@/lib/progress/store';
import type { ProgressRecord } from '@/lib/progress/types';
import { initProgressSync } from '@/lib/progress/sync';

interface ProgressContextValue {
  progressMap: Map<string, ProgressRecord>;
  refreshProgress: () => Promise<void>;
  isLoading: boolean;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const [progressMap, setProgressMap] = useState<Map<string, ProgressRecord>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const tenantId = getTenantId(settings);

  const refreshProgress = async () => {
    if (!tenantId) {
      console.log('[ProgressProvider] No tenant ID available');
      return;
    }

    setIsLoading(true);
    try {
      console.log('[ProgressProvider] Loading progress for tenant:', tenantId);
      const allProgress = await getAllProgress(tenantId);
      const map = new Map(allProgress.map((p) => [p.videoId, p]));
      setProgressMap(map);
    } catch (error) {
      console.error('[ProgressProvider] Failed to load progress:', error);
      // Make sure this doesn't break the app - set empty map
      setProgressMap(new Map());
    } finally {
      setIsLoading(false);
    }
  };

  // Load progress on mount
  useEffect(() => {
    refreshProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  // Listen for progress updates from any tab
  useEffect(() => {
    if (!tenantId) return;

    const cleanup = initProgressSync(() => {
      // Refresh all progress when any update occurs
      refreshProgress();
    });

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  return (
    <ProgressContext.Provider value={{ progressMap, refreshProgress, isLoading }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress must be used within ProgressProvider');
  }
  return context;
}
