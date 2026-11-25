import Link from "next/link";
import { SearchButton } from "@/components/goatmire/search";
import { Menu25 } from "@/components/goatmire/menus";

/** 2025 bar: the stencil logo, search, the other year. His Menu sits top right. */
export function Header25() {
  return (
    <>
      <header className="h25">
        <Link href="/2025" aria-label="Goatmire Elixir 2025 videos">
          <img src="/goatmire/logo25.svg" alt="Goatmire Elixir" className="h25-logo" />
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

/** Year switch + search for the 2026 pages; the nav itself is his. */
export function Switch26() {
  return (
    <p className="switch26">
      <Link href="/2025" className="y25link">2025</Link>
      <span aria-hidden>᛫</span>
      <SearchButton>Search</SearchButton>
    </p>
  );
}
