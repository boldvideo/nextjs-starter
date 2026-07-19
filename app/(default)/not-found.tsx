import Link from "next/link";
import { MarkerUnderline } from "@/components/home/taki-doodles";

export default function NotFound() {
  return (
    <div className="relative flex h-full min-h-[60vh] items-center justify-center overflow-hidden px-6 py-16">
      <div aria-hidden="true" className="taki-dotgrid absolute inset-0" />
      <div className="relative max-w-md text-center">
        <p className="font-scribble rotate-[-2deg] text-xl text-muted-foreground">
          404 — checked the whole library
        </p>
        <h1 className="font-marker mt-1 -rotate-1 text-[clamp(2.2rem,6vw,3.2rem)] leading-[1.02]">
          NEVER FILMED{" "}
          <span className="relative inline-block">
            THAT ONE.
            <MarkerUnderline
              className="absolute -bottom-1.5 left-[-2%] h-[0.2em] w-[104%] text-accent"
              delay={0.3}
            />
          </span>
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
          This page doesn&rsquo;t exist. The good news: 100+ videos do, and
          Taki AI has watched all of them.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="font-marker -rotate-1 rounded-xl bg-accent px-6 py-3 text-[16px] text-accent-foreground shadow-[0_3px_0_rgba(22,21,15,0.3)] transition-transform hover:rotate-1 hover:scale-[1.04]"
          >
            ASK TAKI INSTEAD
          </Link>
          <Link
            href="/videos"
            className="text-sm font-semibold decoration-accent decoration-[2.5px] underline-offset-4 hover:underline"
          >
            Browse the library →
          </Link>
        </div>
      </div>
    </div>
  );
}
