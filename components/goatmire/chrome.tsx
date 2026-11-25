import Link from "next/link";
import { SearchButton } from "@/components/goatmire/search";
import { Menu25 } from "@/components/goatmire/menus";

/** 2025 bar: the stencil logo, search, the other year. His Menu sits top right. */
export function Header25() {
  return (
    <>
      <header className="h25">
        <Link href="/2025" aria-label="Goatmire Elixir 2025 videos">
          <img src="/goatmire/logo25.png" alt="Goatmire Elixir" className="h25-logo" />
        </Link>
        <nav>
          <SearchButton className="search">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            Search
          </SearchButton>
          <Link href="/2026" className="yr26">2026&nbsp;→</Link>
        </nav>
      </header>
      <Menu25 />
    </>
  );
}

/** 2026 bar: the logo, the 2025 videos, his main site, search. */
export function Header26() {
  return (
    <header className="h26">
      <Link href="/2026" aria-label="Goatmire 2026 videos">
        <img src="/goatmire/logo26.svg" alt="Goatmire" className="h26-logo" />
      </Link>
      <nav>
        <Link href="/2025" className="y25link">2025 videos</Link>
        <a href="https://goatmire.com">goatmire.com</a>
        <SearchButton className="search26">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          Search
        </SearchButton>
      </nav>
    </header>
  );
}

/** goatmire.com's own background: dark middle, teal at the edges, fire below. */
export function Temperature() {
  return <div className="temperature" aria-hidden />;
}
