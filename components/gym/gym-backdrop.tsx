import { cn } from "@/lib/utils";

interface GymBackdropProps {
  /** "full" = homepage sunset + rolling floor; "dim" = quiet glow for reading pages */
  variant?: "full" | "dim";
  className?: string;
}

/**
 * The outrun sky: violet night, stars, scanlines. The sun and the floor are
 * anchored to the headline (GymHorizon) so the horizon always sits right
 * under "What's the move?" regardless of viewport height.
 */
export function GymBackdrop({ variant = "full", className }: GymBackdropProps) {
  if (variant === "dim") {
    return (
      <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
        <div className="absolute left-1/2 -top-[340px] -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-[radial-gradient(closest-side,rgba(255,46,166,0.16),transparent)]" />
        <div className="absolute -right-40 top-40 w-[520px] h-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(34,230,255,0.07),transparent)]" />
      </div>
    );
  }

  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {/* Sky: violet at the top, warming toward the horizon */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#0b0618_0%,#140a30_30%,#2a0b4a_48%,#0b0618_100%)]" />

      {/* Stars */}
      <div className="absolute inset-x-0 top-0 h-[60%] opacity-70 bg-[radial-gradient(1px_1px_at_12%_18%,#fff,transparent),radial-gradient(1px_1px_at_28%_8%,#fff,transparent),radial-gradient(1.5px_1.5px_at_71%_14%,#fff,transparent),radial-gradient(1px_1px_at_86%_30%,#fff,transparent),radial-gradient(1px_1px_at_44%_26%,#fff,transparent),radial-gradient(1px_1px_at_92%_6%,#fff,transparent),radial-gradient(1px_1px_at_6%_40%,#fff,transparent),radial-gradient(1.5px_1.5px_at_58%_4%,#fff,transparent)]" />

      <div className="absolute inset-0 gym-scanlines" />
    </div>
  );
}

/**
 * Striped sun setting behind the headline, glowing horizon line at the
 * headline's baseline, neon floor rolling toward the viewer below it.
 * Render inside a `relative` wrapper around the headline; an ancestor with
 * overflow-hidden clips the floor at the page bottom.
 */
export function GymHorizon() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute left-1/2 bottom-[18%] -translate-x-1/2 translate-y-[52%] w-[min(86vw,520px)]">
        <div className="gym-sun w-full" />
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 w-[100vw] bottom-[18%] h-[150vh] translate-y-full overflow-hidden bg-[linear-gradient(180deg,#1c0838_0%,#0b0618_55%)]">
        <div className="gym-floor" />
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 w-[100vw] bottom-[18%] h-px bg-[var(--gym-pink)] shadow-[0_0_24px_4px_rgba(255,46,166,0.7)]" />
    </div>
  );
}
