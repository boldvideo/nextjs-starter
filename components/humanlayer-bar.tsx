"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Paintbrush } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * HumanLayer's site chrome, recreated 1:1 from humanlayer.com — the
 * nav (logo, pipe-separated links, theme switcher, LOG IN / SIGN UP)
 * and their full 15-theme system. Mounted above the portal nav so the
 * library reads as part of their site. Layout rules live in globals.css
 * under the `hl-` namespace, copied from their stylesheet.
 */
const NAV_LINKS = [
  { label: "Learn", href: "https://www.humanlayer.com/#learn-more" },
  { label: "Docs", href: "https://docs.humanlayer.com" },
  { label: "Pricing", href: "https://www.humanlayer.com/#pricing" },
  { label: "FAQ", href: "https://www.humanlayer.com/#faq" },
  { label: "Discord", href: "https://www.humanlayer.com/discord" },
  { label: "Jobs", href: "https://www.humanlayer.com/jobs" },
  { label: "Blog", href: "https://www.humanlayer.com/blog" },
];

// Their theme registry, in their dropdown order. The ids match the
// [data-theme] blocks in globals.css (copied from humanlayer.com).
const THEMES = [
  { id: "poimandres", name: "Poimandres" },
  { id: "lattice-light", name: "Lattice Light" },
  { id: "lattice-dark", name: "Lattice Dark" },
  { id: "solarized-dark", name: "Solarized Dark" },
  { id: "solarized-light", name: "Solarized Light" },
  { id: "catppuccin", name: "Catppuccin" },
  { id: "monokai", name: "Monokai" },
  { id: "gruvbox-dark", name: "Gruvbox Dark" },
  { id: "gruvbox-light", name: "Gruvbox Light" },
  { id: "rose-pine", name: "Rose Pine" },
  { id: "rose-pine-dawn", name: "Rose Pine Dawn" },
  { id: "rose-pine-moon", name: "Rose Pine Moon" },
  { id: "cappuccino", name: "Cappuccino" },
  { id: "high-contrast", name: "High Contrast" },
  { id: "launch", name: "Launch" },
];

const THEME_STORAGE_KEY = "hl-theme";

export function HumanLayerBar({
  className,
  measure = true,
}: {
  className?: string;
  /** Write the measured chrome heights to the --site-* variables. Off for
      in-flow copies (mobile watch pages) so they don't fight the fixed one. */
  measure?: boolean;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [theme, setTheme] = useState("poimandres");
  const barRef = useRef<HTMLDivElement | null>(null);

  // Sync with the pre-paint script in the layout head (which applies the
  // stored theme before hydration to avoid a flash). The timeout keeps the
  // mount commit clean for the react-hooks effect-purity rule.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored && THEMES.some((th) => th.id === stored)) setTheme(stored);
      } catch {}
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // The fixed header frame sizes itself off this variable; measure the
  // real chrome instead of trusting the CSS fallback value.
  useEffect(() => {
    if (!measure) return;
    const root = document.documentElement;
    const apply = () => {
      root.style.setProperty(
        "--site-bar-height",
        `${barRef.current?.offsetHeight ?? 0}px`
      );
    };
    apply();
    const ro = new ResizeObserver(apply);
    if (barRef.current) ro.observe(barRef.current);
    // display:none toggles (watch pages hide the fixed header on mobile,
    // breakpoint crossings flip it back) don't reliably fire
    // ResizeObserver — re-measure on the signals that change visibility:
    // route via deps, viewport via matchMedia.
    const mq = window.matchMedia("(min-width: 1024px)");
    mq.addEventListener("change", apply);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", apply);
    };
  }, [measure, pathname]);

  const selectTheme = (id: string) => {
    setTheme(id);
    setThemeOpen(false);
    document.documentElement.setAttribute("data-theme", id);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {}
  };

  const currentTheme =
    THEMES.find((t) => t.id === theme)?.name ?? "Poimandres";

  return (
    <div className={className}>
      <div ref={barRef} className="hl-nav-header">
        <div className="hl-nav-container">
          <div className="hl-nav-grid">
            <div className="hl-nav-row">
              <a
                aria-label="Go to humanlayer.com"
                className="hl-logo"
                href="https://www.humanlayer.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div
                  aria-label="HumanLayer"
                  style={{
                    height: 34,
                    width: 168,
                    backgroundColor: "var(--fg-primary)",
                    WebkitMask:
                      "url(/logos/humanlayer-full.svg) center center / contain no-repeat",
                    mask: "url(/logos/humanlayer-full.svg) center center / contain no-repeat",
                  }}
                />
              </a>

              <button
                type="button"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                className="hl-mobile-menu-button"
                onClick={() => setMenuOpen((o) => !o)}
              >
                <Menu className="h-6 w-6" aria-hidden="true" />
              </button>

              <nav
                className={cn("hl-main-nav", menuOpen && "nav-open")}
                aria-label="HumanLayer"
              >
                <ul>
                  {NAV_LINKS.map((link) => (
                    <Fragment key={link.href}>
                      <li>
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setMenuOpen(false)}
                        >
                          {link.label}
                        </a>
                      </li>
                      <li className="hl-nav-separator" aria-hidden="true">
                        |
                      </li>
                    </Fragment>
                  ))}
                  <li>
                    <div className="relative">
                      <button
                        type="button"
                        aria-label="Theme switcher"
                        title={currentTheme}
                        className="flex cursor-pointer items-center p-1 text-foreground transition-colors duration-200 hover:text-primary"
                        onClick={() => setThemeOpen((o) => !o)}
                      >
                        <Paintbrush
                          className="mr-2 h-4 w-4"
                          aria-hidden="true"
                        />
                        <span className="text-sm font-medium">
                          {currentTheme}
                        </span>
                      </button>
                      {themeOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setThemeOpen(false)}
                          />
                          <div className="hl-theme-menu">
                            {THEMES.map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => selectTheme(t.id)}
                                className={cn(
                                  "w-full cursor-pointer px-3 py-2 text-left text-sm transition-colors duration-200 hover:bg-[var(--bg-tertiary)] hover:text-primary",
                                  t.id === theme
                                    ? "bg-[var(--bg-tertiary)] font-medium text-primary"
                                    : "text-foreground"
                                )}
                              >
                                {t.name}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </li>
                </ul>
              </nav>

              <div className="hl-nav-actions">
                <a
                  href="https://cloud.humanlayer.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex h-9 items-center gap-3 px-4 font-mono text-sm uppercase tracking-wider border transition-all border-border text-foreground hover:border-primary hover:text-primary"
                >
                  Log in
                </a>
                <a
                  href="https://cloud.humanlayer.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex h-9 items-center gap-3 px-4 font-mono text-sm uppercase tracking-wider border transition-all border-primary bg-primary/10 text-primary hover:bg-primary hover:text-background"
                >
                  Sign Up
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
