import { cn } from "@/lib/utils";

interface PoweredByBoldProps {
  className?: string;
  /**
   * quiet — small attribution for chrome (rail bottom, footers).
   * pitch — the growth-loop version for the moment of wow: sells the
   * outcome ("get this for your videos") right where the AI answer lands.
   */
  variant?: "quiet" | "pitch";
}

export function PoweredByBold({ className, variant = "quiet" }: PoweredByBoldProps) {
  if (variant === "pitch") {
    return (
      <a
        href="https://boldvideo.com?utm_source=portal&utm_medium=portal&utm_campaign=ask"
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "group inline-flex items-center gap-1.5 text-xs",
          "text-muted-foreground/60 hover:text-muted-foreground transition-colors",
          className
        )}
      >
        Want this for your own videos?
        <span className="font-mono font-semibold tracking-[0.08em] text-muted-foreground/80 group-hover:text-primary transition-colors">
          BOLD
        </span>
        <span aria-hidden="true" className="group-hover:translate-x-0.5 transition-transform">
          →
        </span>
      </a>
    );
  }

  return (
    <a
      href="https://boldvideo.com?utm_source=portal&utm_medium=portal"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5",
        "font-mono text-[11px] tracking-[0.02em]",
        "text-muted-foreground/60 hover:text-muted-foreground transition-colors",
        className
      )}
    >
      Powered by
      <span className="font-semibold tracking-[0.08em] text-muted-foreground/80">
        BOLD
      </span>
    </a>
  );
}
