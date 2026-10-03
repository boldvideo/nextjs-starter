import Image from "next/image";
import Link from "next/link";
import { GAME_VERSION } from "@/lib/gym-changelog";

/**
 * The footer under every page: who made this (FounderWell × Bold, both
 * linked back), where to go next, the legal links, and the version (→ the
 * changelog). Put it last inside a page's scroll area; `mt-auto` pins it to
 * the bottom of short pages when that area is a flex column.
 *
 * Privacy and terms point to Bold's (the platform running the game);
 * founderwell.com has no policy page of its own yet.
 */

const FOUNDERWELL = "https://www.founderwell.com?utm_source=gtm-game&utm_medium=footer";
const BOLD = "https://www.boldvideo.com?utm_source=gtm-game&utm_medium=footer";

const PLAY = [
  { label: "New game", href: "/" },
  { label: "Roast my pitch", href: "/roast" },
  { label: "Your quests", href: "/quests" },
];

const ABOUT = [
  { label: "What is this?", href: "#note" },
  { label: "How we built it", href: "/built-by-bold" },
  { label: "Changelog", href: "/changelog" },
];

export function GymFooter() {
  const link = "text-[14px] text-muted-foreground hover:text-foreground transition-colors";

  return (
    <footer className="relative z-10 mt-auto border-t border-[var(--gym-line)] bg-[var(--gym-night)]">
      <div className="max-w-[1080px] mx-auto px-4 md:px-6 pt-10 pb-8">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          {/* Who made this */}
          <div>
            <p className="font-osd text-[17px] leading-none text-muted-foreground">A GAME BY</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
              <a href={FOUNDERWELL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 opacity-90 hover:opacity-100 transition-opacity">
                <Image src="/gym/founderwell-mark-teal.svg" alt="" width={28} height={28} className="h-7 w-7" />
                <span className="text-[21px] font-semibold tracking-tight text-foreground">FounderWell</span>
              </a>
              <span className="font-osd text-[22px] leading-none text-muted-foreground/60" aria-hidden>
                ×
              </span>
              <a href={BOLD} target="_blank" rel="noopener noreferrer" className="opacity-90 hover:opacity-100 transition-opacity" aria-label="Bold">
                <Image src="/bold-logo.svg" alt="Bold" width={88} height={24} className="h-6 w-auto" />
              </a>
            </div>
            <p className="mt-4 max-w-[40ch] text-[13.5px] leading-relaxed text-muted-foreground">
              Real FounderWell coaching sessions, answered by AI on Bold. AI can be wrong; the clip is the source.
            </p>
          </div>

          <nav className="flex gap-14" aria-label="Footer">
            <ul className="space-y-2.5">
              {PLAY.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={link}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="space-y-2.5">
              {ABOUT.map((l) => (
                <li key={l.href}>
                  {l.href.startsWith("#") ? (
                    <a href={l.href} className={link}>
                      {l.label}
                    </a>
                  ) : (
                    <Link href={l.href} className={link}>
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 pt-5 border-t border-[var(--gym-line)] flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[12.5px] text-muted-foreground/70">
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>© 2026 FounderWell & Bold</span>
            <a href="https://www.boldvideo.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              Privacy
            </a>
            <a href="https://www.boldvideo.com/terms" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              Terms
            </a>
          </p>
          <Link href="/changelog" className="font-osd text-[16px] leading-none hover:text-[var(--gym-cyan)]">
            v{GAME_VERSION}
          </Link>
        </div>
      </div>
    </footer>
  );
}
