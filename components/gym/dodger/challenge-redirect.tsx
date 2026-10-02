"use client";

import { useEffect } from "react";

/**
 * Crawlers read the challenge card; players go straight to the run. A full
 * load, not a router push: the arcade (in the layout) reads ?play=daily only
 * when it mounts.
 */
export function ChallengeRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return null;
}
