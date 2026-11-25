"use client";

import { useRef } from "react";
import Link from "next/link";

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
