"use client";

type ProgressUpdateMessage = {
  type: 'progress-update';
  videoId: string;
  tenantId: string;
  timestamp: number;
};

type ProgressSyncCallback = (message: ProgressUpdateMessage) => void;

let broadcastChannel: BroadcastChannel | null = null;
let storageListeners: ProgressSyncCallback[] = [];
let sameTabListeners: ProgressSyncCallback[] = [];

/**
 * Initialize cross-tab synchronization
 * Uses BroadcastChannel with localStorage fallback
 * Also registers for same-tab updates
 */
export function initProgressSync(callback: ProgressSyncCallback): () => void {
  // Register for same-tab updates first
  sameTabListeners.push(callback);

  // Try BroadcastChannel first (modern browsers)
  if (typeof BroadcastChannel !== 'undefined') {
    if (!broadcastChannel) {
      broadcastChannel = new BroadcastChannel('bold-progress');
    }

    const handleMessage = (event: MessageEvent<ProgressUpdateMessage>) => {
      if (event.data.type === 'progress-update') {
        callback(event.data);
      }
    };

    broadcastChannel.addEventListener('message', handleMessage);

    return () => {
      broadcastChannel?.removeEventListener('message', handleMessage);
      sameTabListeners = sameTabListeners.filter((cb) => cb !== callback);
    };
  }

  // Fallback to storage events (older browsers)
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'bold-progress-sync' && e.newValue) {
      try {
        const message = JSON.parse(e.newValue) as ProgressUpdateMessage;
        callback(message);
      } catch {
        // Ignore parse errors
      }
    }
  };

  storageListeners.push(callback);
  window.addEventListener('storage', handleStorageChange);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
    storageListeners = storageListeners.filter((cb) => cb !== callback);
    sameTabListeners = sameTabListeners.filter((cb) => cb !== callback);
  };
}

/**
 * Broadcast a progress update to other tabs AND same tab
 */
export function broadcastProgressUpdate(
  videoId: string,
  tenantId: string
): void {
  const message: ProgressUpdateMessage = {
    type: 'progress-update',
    videoId,
    tenantId,
    timestamp: Date.now(),
  };

  // Notify same-tab listeners immediately (for sidebar updates)
  sameTabListeners.forEach((callback) => {
    try {
      callback(message);
    } catch (error) {
      console.warn('[ProgressSync] Same-tab callback error:', error);
    }
  });

  // Try BroadcastChannel for cross-tab sync
  if (broadcastChannel) {
    broadcastChannel.postMessage(message);
  } else {
    // Fallback to localStorage for cross-tab sync
    try {
      localStorage.setItem('bold-progress-sync', JSON.stringify(message));
    } catch {
      // Fail silently
    }
  }
}

/**
 * Cleanup sync connections
 */
export function cleanupProgressSync(): void {
  if (broadcastChannel) {
    broadcastChannel.close();
    broadcastChannel = null;
  }
  storageListeners = [];
  sameTabListeners = [];
}
