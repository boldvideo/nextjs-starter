import { cn } from "@/lib/utils";

/**
 * The SRL lockup: chunky 900-weight caps with an orange full stop —
 * the show's initials in the startups.com type voice. Scales with
 * font-size, so callers size it with text classes.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-heading inline-flex select-none items-baseline whitespace-nowrap",
        "text-[22px] font-black leading-none tracking-tight text-foreground",
        className
      )}
    >
      SRL<span className="text-accent">.</span>
    </span>
  );
}
