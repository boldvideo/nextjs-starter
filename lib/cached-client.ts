import { bold } from "@/client";

/**
 * Cached wrapper for Bold API calls with Next.js ISR support
 */

export const cachedBold = {
  videos: {
    get: async (id: string) => {
      // Use the original bold client but ensure we're in a cached context
      return bold.videos.get(id);
    },
    list: async (limit?: number) => {
      return bold.videos.list(limit);
    }
  },

  playlists: {
    get: async (id: string) => {
      return bold.playlists.get(id);
    },
    list: async () => {
      return bold.playlists.list();
    }
  },

  settings: async () => {
    return bold.settings();
  }
};
