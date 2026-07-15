import { cn } from "@/lib/utils";

/**
 * Text wordmark shown when the tenant has no logo configured.
 * Mirrors the show's lockup on boundaryml.com/podcast: lowercase
 * "ai that works." with "works" in serif italic, tinted by the theme's
 * primary (Boundary purple in light, teal in dark).
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline select-none whitespace-nowrap",
        "font-[family-name:var(--font-heading)] font-semibold text-foreground",
        "text-[21px] leading-none tracking-[-0.03em]",
        className
      )}
    >
      ai&nbsp;that&nbsp;
      <span className="font-[family-name:var(--font-serif-brand)] italic font-medium text-primary text-[1.06em]">
        works
      </span>
      .
    </span>
  );
}
