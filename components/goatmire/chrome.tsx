import Link from "next/link";
import { SearchButton } from "@/components/goatmire/search";

/** 2025 header: the stencil logo, the tracks, search, and the door to 2026. */
export function Header25({ active }: { active?: "talks" }) {
  return (
    <header className="h25">
      <Link href="/2025" aria-label="Goatmire Elixir 2025">
        <img src="/goatmire/logo25.svg" alt="Goatmire Elixir" className="h25-logo" />
      </Link>
      <nav>
        <Link href="/2025" className={active === "talks" ? "on" : ""}>Talks</Link>
        <Link href="/2025#wednesday-10-september">NervesConf EU</Link>
        <Link href="/2025#thursday-11-september">Goatmire Elixir</Link>
        <SearchButton className="search">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          Search what was said
        </SearchButton>
        <Link href="/2026" className="yr26">2026&nbsp;→</Link>
      </nav>
    </header>
  );
}

/** 2026 right rail, as on goatmire.com. */
export function Rail26({ active }: { active?: string }) {
  const items: Array<[string, string, string?]> = [
    ["Home", "/"],
    ["Talks", "/2026"],
    ["NervesConf EU", "/2026#30th-of-september"],
    ["Goatmire Elixir", "/2026#1st-of-october"],
  ];
  return (
    <nav className="rail">
      {items.map(([label, href]) => (
        <Link key={label} href={href} className={active === label ? "on" : ""}>{label}</Link>
      ))}
      <SearchButton className="rail-btn">Search</SearchButton>
      <Link href="/2025" className="to25">2025</Link>
    </nav>
  );
}
