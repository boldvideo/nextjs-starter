import { cn } from "@/lib/utils";

/** Shift AI has no logo file: the wordmark is live Bebas Neue text, "AI" in acid. */
export function Wordmark({ className, sub }: { className?: string; sub?: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-3 whitespace-nowrap", className)}>
      <span className="font-display text-[30px] leading-none tracking-[0.06em] text-[#fafaf8]">
        SHIFT <span className="text-acid">AI</span>
      </span>
      {sub && (
        <span className="sx-label hidden sm:inline text-muted-foreground border-l border-border pl-3">{sub}</span>
      )}
    </span>
  );
}
