"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/**
 * Boundary's site nav, recreated 1:1 from boundaryml.com (markup, colors,
 * spacing, hover states, hamburger + mobile panel) and mounted above the
 * portal nav so the library reads as part of their site. It keeps their
 * cream in both themes — it's their bar, not ours. Styles live in
 * globals.css under the `bnav` namespace, copied from their inline CSS.
 */
const NAV_LINKS = [
  { label: "Quickstart", href: "https://boundaryml.com/quickstart" },
  { label: "Podcast", href: "https://boundaryml.com/podcast" },
  { label: "Team", href: "https://boundaryml.com/who-are-we" },
  { label: "Changelog", href: "https://boundaryml.com/changelog" },
  { label: "agent tries baml", href: "https://boundaryml.com/atb" },
];

// Their banner counts down to the BAML EAP launch ("46 days" on Jul 15 2026)
const LAUNCH_UTC = Date.UTC(2026, 7, 30);

export function BoundaryBar() {
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState<string | null>(null);
  const [daysToLaunch, setDaysToLaunch] = useState<number | null>(null);

  useEffect(() => {
    // One-shot clock read after mount (impure during render, so it lives
    // here); the timeout keeps the mount commit clean.
    const t = setTimeout(() => {
      setDaysToLaunch(
        Math.max(0, Math.ceil((LAUNCH_UTC - Date.now()) / 86_400_000))
      );
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Live star count like theirs; the 4ch slot reserves space until it lands.
  useEffect(() => {
    let cancelled = false;
    fetch("https://api.github.com/repos/boundaryml/baml")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && typeof d?.stargazers_count === "number") {
          setStars(d.stargazers_count.toLocaleString("en-US"));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="bnav-wrap">
      <div className="sbanner">
        <a
          className="sbanner-cta"
          href="https://boundaryml.com/eap"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="sbanner-new">New</span>
          <span className="sbanner-text">
            {daysToLaunch != null ? `${daysToLaunch} days to launch` : "Launching soon"}
            &nbsp; ·&nbsp; join a live onboarding, <strong>every Thursday</strong>
          </span>
          <span aria-hidden="true" className="sbanner-arrow">
            →
          </span>
        </a>
        <a
          className="sbanner-olddocs"
          href="https://docs.boundaryml.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Old Docs
        </a>
      </div>
      <nav className="bnav" aria-label="Boundary">
        <a
          className="bnav-brand"
          href="https://boundaryml.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          BAML
        </a>

        <div className="bnav-links">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              className="bnav-link"
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="bnav-actions">
          <a
            aria-label="Join the BAML Discord"
            className="bnav-social"
            rel="noopener noreferrer"
            target="_blank"
            href="https://boundaryml.com/discord"
          >
            <Image src="/logos/discord-icon.svg" alt="Discord" width={16} height={16} />
          </a>
          <a
            aria-label={`BAML on GitHub${stars ? `, ${stars} stars` : ""}`}
            className="bnav-gh"
            rel="noopener noreferrer"
            target="_blank"
            href="https://github.com/boundaryml/baml"
          >
            <Image
              src="/logos/github-mark.svg"
              alt="GitHub"
              width={14}
              height={14}
              className="size-3.5"
            />
            <span className="min-w-[4ch] tabular-nums">{stars ?? ""}</span>
          </a>
          <a className="bnav-cta" href="https://boundaryml.com/explore" target="_blank" rel="noopener noreferrer">
            <Image
              src="/logos/baml-lamb-white.png"
              alt=""
              aria-hidden="true"
              width={16}
              height={16}
            />
            Learn BAML
          </a>
        </div>

        <button
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="bnav-toggle"
          type="button"
          onClick={() => setOpen((o) => !o)}
        >
          <span className={`bnav-toggle-bar${open ? " is-open-1" : ""}`} />
          <span className={`bnav-toggle-bar${open ? " is-open-2" : ""}`} />
          <span className={`bnav-toggle-bar${open ? " is-open-3" : ""}`} />
        </button>
      </nav>

      <div className={`bnav-panel${open ? " is-open" : ""}`}>
        {NAV_LINKS.map((link) => (
          <a
            key={link.href}
            className="bnav-mobile-link"
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            {link.label}
          </a>
        ))}
        <div className="bnav-mobile-footer">
          <a
            aria-label="Join the BAML Discord"
            className="bnav-social"
            rel="noopener noreferrer"
            target="_blank"
            href="https://boundaryml.com/discord"
          >
            <Image src="/logos/discord-icon.svg" alt="Discord" width={16} height={16} />
          </a>
          <a
            aria-label={`BAML on GitHub${stars ? `, ${stars} stars` : ""}`}
            className="bnav-gh"
            rel="noopener noreferrer"
            target="_blank"
            href="https://github.com/boundaryml/baml"
          >
            <Image
              src="/logos/github-mark.svg"
              alt="GitHub"
              width={14}
              height={14}
              className="size-3.5"
            />
            <span className="min-w-[4ch] tabular-nums">{stars ?? ""}</span>
          </a>
        </div>
        <a
          className="bnav-cta bnav-cta--mobile"
          href="https://boundaryml.com/explore"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            src="/logos/baml-lamb-white.png"
            alt=""
            aria-hidden="true"
            width={16}
            height={16}
          />
          Learn BAML
        </a>
      </div>
    </div>
  );
}
