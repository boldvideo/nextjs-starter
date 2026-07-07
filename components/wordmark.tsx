import { cn } from "@/lib/utils";

/**
 * Text wordmark shown when the tenant has no logo configured.
 * This fork intentionally drops the BOLD logo fallback.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 select-none whitespace-nowrap",
        "font-[family-name:var(--font-heading)] font-bold text-primary",
        "text-[22px] leading-none tracking-[0.06em]",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="w-[7px] h-[7px] rounded-[2px] bg-primary shadow-[0_0_12px_rgba(45,212,191,0.7)]"
      />
      AI That Works
    </span>
  );
}
