import Image from "next/image";
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
        href="https://www.boldvideo.com"
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "group inline-flex items-center gap-1.5 text-xs",
          "text-muted-foreground/60 hover:text-muted-foreground transition-colors",
          className
        )}
      >
        Want this for your own videos?
        <Image
          src="/bold-logo-black.svg"
          alt="Bold Video"
          width={975}
          height={267}
          className="h-[13px] w-auto opacity-70 transition-opacity group-hover:opacity-100 dark:invert"
        />
        <span aria-hidden="true" className="group-hover:translate-x-0.5 transition-transform">
          →
        </span>
      </a>
    );
  }

  return (
    <a
      href="https://www.boldvideo.com"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group inline-flex items-center gap-2",
        "font-mono text-[11px] tracking-[0.02em]",
        "text-muted-foreground/60 hover:text-muted-foreground transition-colors",
        className
      )}
    >
      Powered by
      <Image
        src="/bold-logo-black.svg"
        alt="Bold Video"
        width={975}
        height={267}
        className="h-[15px] w-auto opacity-60 transition-opacity group-hover:opacity-90 dark:invert"
      />
    </a>
  );
}
