"use client";

// Types for the search API response
export type SearchHit = {
  internal_id: string;
  short_id: string;
  title: string;
  thumbnail: string | null;
  description: string | null;
  duration: number;
  publishedAt: string;
  has_metadata_match: boolean;
  metadata_matches: {
    title: boolean;
    description: boolean;
    teaser: boolean;
  };
  segments: {
    start_time: number;
    end_time: number;
    text: string;
    speakers: string[];
    has_highlight: boolean;
    highlighted_text: string;
    matched_in_text: boolean;
    snippet: string;
    video_link: string;
  }[];
};

export type SearchResponse = {
  hits: SearchHit[];
  page: number;
  per_page: number;
  total_hits: number;
  processing_time_ms: number;
};

/**
 * Performs a search against the Bold Video API
 */
export async function searchVideos(
  query: string,
  slug: string,
  _token: string
): Promise<SearchResponse> {
  if (!query || query.trim().length < 2) {
    return {
      hits: [],
      page: 1,
      per_page: 10,
      total_hits: 0,
      processing_time_ms: 0,
    };
  }

  try {
    // Use POST to avoid URL parsing issues
    const response = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, slug }),
    });

    if (!response.ok) {
      throw new Error(`Search failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Search error:", error);
    throw error;
  }
}
