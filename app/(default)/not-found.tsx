import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative flex h-full min-h-[60vh] items-center justify-center overflow-hidden px-6 py-16">
      <div className="relative max-w-lg text-center">
        <span className="srl-badge">404 · Request Not Found</span>
        <h1 className="mt-5 font-heading text-[clamp(2rem,5vw,3rem)] font-extrabold leading-[1.2]">
          This page didn&rsquo;t
          <br />
          <span className="srl-gradient-text">make the show.</span>
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
          The link&rsquo;s off — but every episode of Startup Requests Live is
          still here, and the answer desk has watched all of them.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/ask"
            className="flex h-11 items-center gap-1.5 rounded-[6px] bg-accent px-5 font-heading text-[15px] font-semibold text-[#09090b] transition-colors hover:bg-[var(--accent-hover)]"
          >
            Ask the Answer Desk
            <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
          </Link>
          <Link
            href="/videos"
            className="flex h-11 items-center rounded-[5.25px] border border-border-strong px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            Browse episodes
          </Link>
        </div>
      </div>
    </div>
  );
}
