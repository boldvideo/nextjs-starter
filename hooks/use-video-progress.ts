"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSettings } from '@/components/providers/settings-provider';
import { getTenantId } from '@/lib/progress/tenant';
import {
  getProgress,
  saveProgress,
  deleteProgress,
  isIndexedDBAvailable,
  isIndexedDBDefined,
} from '@/lib/progress/store';
import type { ProgressRecord } from '@/lib/progress/types';
import { PROGRESS_CONFIG } from '@/lib/progress/types';
import { initProgressSync } from '@/lib/progress/sync';

interface UseVideoProgressOptions {
  videoId: string;
  duration: number;
  playerRef: React.RefObject<HTMLVideoElement | null>;
  enabled?: boolean; // Allow disabling (for opt-out)
}

interface UseVideoProgressReturn {
  progress: ProgressRecord | null;
  isLoading: boolean;
  saveCurrentProgress: (position: number) => Promise<void>;
  clearProgress: () => Promise<void>;
  resumePosition: number | null;
}

/**
 * Hook for tracking video progress with IndexedDB persistence
 * Automatically saves progress on timeupdate, pause, seeking, and ended events
 */
export function useVideoProgress({
  videoId,
  duration,
  playerRef,
  enabled = true,
}: UseVideoProgressOptions): UseVideoProgressReturn {
  const settings = useSettings();
  const [progress, setProgress] = useState<ProgressRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resumePosition, setResumePosition] = useState<number | null>(null);
  const [playerReady, setPlayerReady] = useState(false);

  // Throttling state
  const lastSaveTimeRef = useRef<number>(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Refs for mutable values to avoid stale closures
  const progressRef = useRef<ProgressRecord | null>(null);
  const tenantIdRef = useRef<string | null>(null);
  const canUseStorageRef = useRef<boolean>(false);

  // Get tenant ID
  const tenantId = getTenantId(settings);
  
  console.log('[useVideoProgress] Hook called for video:', videoId, 'enabled:', enabled, 'tenantId:', tenantId);

  // Check if we can use IndexedDB (sync check for initial render)
  const canUseStorage = enabled && isIndexedDBDefined() && tenantId !== null;
  
  console.log('[useVideoProgress] canUseStorage (sync):', canUseStorage);

  // Check when player becomes available
  useEffect(() => {
    const checkPlayer = () => {
      const hasPlayer = !!playerRef.current;
      if (hasPlayer !== playerReady) {
        console.log('[useVideoProgress] Player availability changed:', hasPlayer);
        setPlayerReady(hasPlayer);
      }
    };

    // Check immediately
    checkPlayer();

    // Check periodically until player is ready
    const interval = playerReady ? null : setInterval(checkPlayer, 100);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [playerRef, playerReady]);

  // Sync refs with current values
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    tenantIdRef.current = tenantId;
  }, [tenantId]);

  useEffect(() => {
    canUseStorageRef.current = canUseStorage;
  }, [canUseStorage]);

  /**
   * Probe actual IndexedDB availability on mount
   * Updates canUseStorageRef with real availability (catches private mode, quota, etc.)
   */
  useEffect(() => {
    if (!enabled || !tenantId) {
      console.log('[useVideoProgress] Storage disabled - enabled:', enabled, 'tenantId:', tenantId);
      canUseStorageRef.current = false;
      return;
    }

    // Async probe on mount
    console.log('[useVideoProgress] Testing IndexedDB availability...');
    isIndexedDBAvailable().then((available) => {
      console.log('[useVideoProgress] IndexedDB available:', available);
      canUseStorageRef.current = available;
    });
  }, [enabled, tenantId]);

  /**
   * Clear pending timeout when video changes or component unmounts
   */
  useEffect(() => {
    return () => {
      // Clear any pending timeout when effect re-runs or unmounts
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [videoId, duration]);

  /**
   * Load existing progress on mount
   */
  useEffect(() => {
    if (!canUseStorage || !tenantId) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    async function loadProgress() {
      // TypeScript guard: we've already checked tenantId above
      if (!tenantId) return;

      try {
        const existingProgress = await getProgress(tenantId, videoId);

        if (mounted) {
          setProgress(existingProgress);

          // Set resume position if video not completed
          if (existingProgress && !existingProgress.completed && existingProgress.position > 0) {
            setResumePosition(existingProgress.position);
          }
        }
      } catch (error) {
        console.warn('[useVideoProgress] Failed to load progress:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadProgress();

    return () => {
      mounted = false;
    };
  }, [canUseStorage, tenantId, videoId]);

  /**
   * Listen for progress updates from other tabs
   */
  useEffect(() => {
    if (!canUseStorage || !tenantId) return;

    // Listen for updates from other tabs
    const cleanup = initProgressSync(async (message) => {
      // Only refresh if this video was updated
      if (message.videoId === videoId && message.tenantId === tenantId) {
        const updatedProgress = await getProgress(tenantId, videoId);
        setProgress(updatedProgress);
      }
    });

    return cleanup;
  }, [canUseStorage, tenantId, videoId]);

  /**
   * Save progress to IndexedDB with throttling
   */
  const saveCurrentProgress = useCallback(
    async (position: number) => {
      // Access latest values from refs
      const currentTenantId = tenantIdRef.current;
      const currentCanUseStorage = canUseStorageRef.current;
      const currentProgress = progressRef.current;

      console.log('[useVideoProgress] saveCurrentProgress called:', {
        videoId,
        position,
        currentTenantId,
        currentCanUseStorage,
        hasProgress: !!currentProgress
      });

      if (!currentCanUseStorage || !currentTenantId) {
        console.log('[useVideoProgress] Save blocked - canUseStorage:', currentCanUseStorage, 'tenantId:', currentTenantId);
        return;
      }

      const now = Date.now();
      const timeSinceLastSave = now - lastSaveTimeRef.current;

      // Throttle: Only save if enough time has passed
      if (timeSinceLastSave < PROGRESS_CONFIG.THROTTLE_INTERVAL) {
        // Schedule a save for later
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
          saveProgressRef.current(position);
        }, PROGRESS_CONFIG.THROTTLE_INTERVAL - timeSinceLastSave);

        return;
      }

      // Save immediately
      lastSaveTimeRef.current = now;

      try {
        await saveProgress(currentTenantId, videoId, position, duration);

        // Update local state with furthest position tracking
        const furthestPosition = Math.max(
          position,
          currentProgress?.furthestPosition || 0
        );
        const percentWatched = Math.min((furthestPosition / duration) * 100, 100);
        const completed = percentWatched >= PROGRESS_CONFIG.COMPLETION_THRESHOLD;

        setProgress({
          id: `${currentTenantId}:${videoId}`,
          videoId,
          tenantId: currentTenantId,
          position,
          furthestPosition,
          duration,
          percentWatched,
          completed,
          lastWatched: new Date().toISOString(),
          version: PROGRESS_CONFIG.VERSION,
        });
      } catch (error) {
        console.warn('[useVideoProgress] Failed to save progress:', error);
      }
    },
    [videoId, duration]
  );

  // Keep ref synchronized with latest callback on every render
  const saveProgressRef = useRef(saveCurrentProgress);
  saveProgressRef.current = saveCurrentProgress;

  /**
   * Clear progress for this video
   */
  const clearProgress = useCallback(async () => {
    if (!canUseStorage || !tenantId) return;

    try {
      await deleteProgress(tenantId, videoId);
      setProgress(null);
      setResumePosition(null);
    } catch (error) {
      console.warn('[useVideoProgress] Failed to clear progress:', error);
    }
  }, [canUseStorage, tenantId, videoId]);

  /**
   * Attach player event listeners
   * Re-run when player becomes available
   */
  useEffect(() => {
    const player = playerRef.current;
    console.log('[useVideoProgress] Event listener effect:', {
      hasPlayer: !!player,
      playerReady,
      canUseStorage,
      videoId,
      playerType: player?.constructor?.name
    });
    
    if (!player || !canUseStorage || !playerReady) return;

    console.log('[useVideoProgress] Attaching event listeners to player');

    const handleTimeUpdate = () => {
      const position = player.currentTime;
      console.log('[useVideoProgress] timeupdate event:', position);
      saveProgressRef.current(position);
    };

    const handlePause = () => {
      const position = player.currentTime;
      
      // Clear any pending throttled save to prevent stale overwrites
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      
      // Force immediate save on pause (bypass throttle)
      lastSaveTimeRef.current = 0;
      saveProgressRef.current(position);
    };

    const handleSeeking = () => {
      const position = player.currentTime;
      
      // Clear any pending throttled save to prevent stale overwrites
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      
      // Force immediate save on seek (bypass throttle)
      lastSaveTimeRef.current = 0;
      saveProgressRef.current(position);
    };

    const handleEnded = () => {
      // Clear any pending throttled save to prevent stale overwrites
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      
      // Mark as complete (100% position)
      lastSaveTimeRef.current = 0;
      saveProgressRef.current(duration);
    };

    // Attach event listeners
    player.addEventListener('timeupdate', handleTimeUpdate);
    player.addEventListener('pause', handlePause);
    player.addEventListener('seeking', handleSeeking);
    player.addEventListener('ended', handleEnded);

    return () => {
      // Cleanup
      player.removeEventListener('timeupdate', handleTimeUpdate);
      player.removeEventListener('pause', handlePause);
      player.removeEventListener('seeking', handleSeeking);
      player.removeEventListener('ended', handleEnded);

      // Clear pending save timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [playerReady, canUseStorage, duration]);

  return {
    progress,
    isLoading,
    saveCurrentProgress,
    clearProgress,
    resumePosition,
  };
}
