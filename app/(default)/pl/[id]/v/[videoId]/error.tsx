"use client";

import { useEffect } from "react";

export default function Error(props: { error: Error; reset: () => void }) {
  const { error, reset } = props;

  useEffect(() => {
    console.error("Playlist video page error:", error);
  }, [error]);

  return (
    <div className="p-5 md:p-10 max-w-screen-2xl mx-auto">
      <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-8">
        <h2 className="text-lg font-medium mb-2">Something went wrong</h2>
        <p className="text-sm mb-4">
          Failed to load the playlist video. The video may have been removed or
          the playlist may no longer contain this video.
        </p>
        <button
          className="underline text-sm font-medium"
          onClick={() => reset()}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
