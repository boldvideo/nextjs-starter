import { createClient } from "@boldvideo/bold-js";

type BoldClient = ReturnType<typeof createClient>;

/**
 * Cached wrapper for Bold API calls with Next.js ISR support.
 *
 * Usage:
 * ```typescript
 * const context = await getTenantContext();
 * const videos = await createCachedBold(context.client).videos.list();
 * ```
 *
 * @param client - The Bold client instance from TenantContext
 */
export function createCachedBold(client: BoldClient) {
  return {
    videos: {
      get: async (id: string) => {
        return client.videos.get(id);
      },
      list: async (limit?: number) => {
        return client.videos.list(limit);
      },
    },

    playlists: {
      get: async (id: string) => {
        return client.playlists.get(id);
      },
      list: async () => {
        return client.playlists.list();
      },
    },

    settings: async () => {
      return client.settings();
    },
  };
}

/**
 * @deprecated Use createCachedBold(context.client) instead.
 * This export maintains backwards compatibility for standalone mode only.
 */
export const cachedBold = {
  videos: {
    get: async (_id: string) => {
      throw new Error(
        "cachedBold is deprecated. Use createCachedBold(context.client) with getTenantContext()."
      );
    },
    list: async (_limit?: number) => {
      throw new Error(
        "cachedBold is deprecated. Use createCachedBold(context.client) with getTenantContext()."
      );
    },
  },

  playlists: {
    get: async (_id: string) => {
      throw new Error(
        "cachedBold is deprecated. Use createCachedBold(context.client) with getTenantContext()."
      );
    },
    list: async () => {
      throw new Error(
        "cachedBold is deprecated. Use createCachedBold(context.client) with getTenantContext()."
      );
    },
  },

  settings: async () => {
    throw new Error(
      "cachedBold is deprecated. Use createCachedBold(context.client) with getTenantContext()."
    );
  },
};
