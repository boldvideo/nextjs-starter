import { cn } from "@/lib/utils";

/**
 * Hand-drawn SVG accents for the Taki skin. Strokes use pathLength=1 so
 * the draw-in animation (animate-taki-draw) works regardless of real
 * path length. Color rides on currentColor.
 */

interface DoodleProps {
  className?: string;
  /** Seconds before the stroke starts drawing itself. */
  delay?: number;
}

/** Rough marker underline, sized to sit under a word. */
export function MarkerUnderline({ className, delay = 0 }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 300 22"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("pointer-events-none", className)}
    >
      <path
        d="M4 14 C 60 6, 120 18, 180 10 S 280 14, 296 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        pathLength={1}
        className="animate-taki-draw"
        style={{ animationDelay: `${delay}s` }}
      />
    </svg>
  );
}

/** Casual arrow that swings down-right (headline → chat). */
export function ArrowScribble({ className, delay = 0 }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 150 90"
      aria-hidden="true"
      className={cn("pointer-events-none", className)}
    >
      <path
        d="M10 12 C 50 30, 90 30, 118 62"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        pathLength={1}
        className="animate-taki-draw"
        style={{ animationDelay: `${delay}s` }}
      />
      <path
        d="M104 56 L120 65 L112 46"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="animate-taki-draw"
        style={{ animationDelay: `${delay + 0.35}s` }}
      />
    </svg>
  );
}

/** Short connector arrow for the how-it-works steps. */
export function StepArrow({ className, delay = 0 }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 64 44"
      aria-hidden="true"
      className={cn("pointer-events-none", className)}
    >
      <path
        d="M4 22 C 20 14, 40 30, 56 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        pathLength={1}
        className="animate-taki-draw"
        style={{ animationDelay: `${delay}s` }}
      />
      <path
        d="M46 12 L58 20 L46 30"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="animate-taki-draw"
        style={{ animationDelay: `${delay + 0.25}s` }}
      />
    </svg>
  );
}
