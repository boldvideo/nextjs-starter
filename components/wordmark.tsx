import { cn } from "@/lib/utils";

/**
 * The Taki AI lockup: "TAKI" in his marker hand, "AI" sitting on a gold
 * highlighter swipe. Scales with font-size, so callers can size it with
 * text classes.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-marker inline-flex items-baseline gap-[0.18em] select-none whitespace-nowrap",
        "text-[22px] leading-none text-foreground -rotate-1",
        className
      )}
    >
      TAKI
      <span className="relative inline-block">
        <span
          aria-hidden="true"
          className="absolute -inset-x-[0.14em] inset-y-[-0.08em] -skew-x-6 rounded-[0.18em] bg-accent"
        />
        <span className="relative">AI</span>
      </span>
    </span>
  );
}
