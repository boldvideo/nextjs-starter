"use client";

import { useRef } from "react";
import Link from "next/link";

/**
 * goatmire.com's own navigation, markup and behaviour as on his site (a CSS
 * checkbox toggle, no JS), with one item added: Videos. His links point back
 * to goatmire.com.
 */
export function Menu26() {
  const toggle = useRef<HTMLInputElement | null>(null);
  const close = () => {
    if (toggle.current) toggle.current.checked = false;
  };
  const site = "https://goatmire.com";
  return (
    <div className="m26">
      <input ref={toggle} type="checkbox" id="menu-toggle-26" className="menu-toggle sr-only" />
      <label htmlFor="menu-toggle-26" className="menu-button" aria-label="Toggle menu">
        <svg className="menu-icon hamburger-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <svg className="menu-icon close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6l-12 12" />
        </svg>
      </label>
      <label htmlFor="menu-toggle-26" className="menu-backdrop" aria-hidden="true" />
      <nav className="menu">
        <ul className="menu-list">
          <li><a href={`${site}/`} className="menu-link">Home</a></li>
          <li><a href={`${site}/#speakers`} className="menu-link">Speakers</a></li>
          <li><a href={`${site}/#workshops`} className="menu-link">Workshops</a></li>
          <li><a href={`${site}/#ashconf`} className="menu-link menu-link-ash">AshConf</a></li>
          <li><a href={`${site}/#hackathon`} className="menu-link menu-link-hackathon">Hackathon</a></li>
          <li><a href={`${site}/#tickets`} className="menu-link">Tickets</a></li>
          <li><a href={`${site}/#sponsors`} className="menu-link">Sponsors</a></li>
          <li><a href={`${site}/practical`} className="menu-link">Practical</a></li>
          <li><a href={`${site}/schedule`} className="menu-link">Schedule</a></li>
          <li><Link href="/2026" className="menu-link menu-link-here" onClick={close} aria-current="page">Videos</Link></li>
        </ul>
      </nav>
    </div>
  );
}

/** 2025.goatmire.com's navigation: the hand-lettered Menu and its black sheet. */
export function Menu25() {
  const toggle = useRef<HTMLInputElement | null>(null);
  const close = () => {
    if (toggle.current) toggle.current.checked = false;
  };
  const site = "https://2025.goatmire.com";
  return (
    <div className="m25">
      <label className="menu-button text-rough" htmlFor="menu-toggle-25">Menu</label>
      <input ref={toggle} type="checkbox" className="menu-toggle" id="menu-toggle-25" hidden />
      <nav id="menu-25">
        <a className="menu-link" onClick={close} href={`${site}/#speakers`}>Goatmire Speakers</a>
        <a className="menu-link" onClick={close} href={`${site}/#nervesconf-speakers`}>NervesConf Speakers</a>
        <a className="menu-link" onClick={close} href={`${site}/gallery/index.html`}>Gallery</a>
        <a className="menu-link" onClick={close} href={`${site}/#hotels`}>Hotels</a>
        <a className="menu-link" onClick={close} href={`${site}/#travel`}>Travel</a>
        <a className="menu-link" onClick={close} href={`${site}/#info`}>Info</a>
        <a className="menu-link" onClick={close} href={`${site}/#contact`}>Contact</a>
        <Link className="menu-link menu-link-here" onClick={close} href="/2025" aria-current="page">Videos</Link>
      </nav>
    </div>
  );
}
