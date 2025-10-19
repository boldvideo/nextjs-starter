import type { Settings } from '@boldvideo/bold-js';
import { PROGRESS_CONFIG } from './types';

/**
 * Extract tenant ID from settings
 * Format: "bt_${slug}" (e.g., "bt_ranger")
 */
export function getTenantId(settings: Settings | null): string | null {
  if (!settings?.account?.slug) {
    console.warn('[ProgressStore] No tenant slug in settings');
    return null;
  }

  return `${PROGRESS_CONFIG.STORAGE_KEY_PREFIX}${settings.account.slug}`;
}
