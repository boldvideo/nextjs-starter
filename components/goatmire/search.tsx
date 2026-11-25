"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Year = 2025 | 2026;

interface Segment {
  start_time: number;
  highlighted_text?: string;
  text?: string;
  matched_in_text?: boolean;
}
interface Hit {
  short_id: string;
  video_id: string;
  title: string;
  thumbnail?: string;
  duration?: number;
  segments: Segment[];
}

function stamp(seconds: number): string {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  return h ? `${h}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}` : `${m}:${String(s % 60).padStart(2, "0")}`;
}

/** Keep the API's <mark> highlighting, drop any other markup. */
function safeHighlight(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&lt;mark&gt;/g, "<mark>")
    .replace(/&lt;\/mark&gt;/g, "</mark>");
}

export function openSearch() {
  window.dispatchEvent(new Event("goat:search"));
}

export function SearchButton({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <button type="button" className={className} onClick={openSearch}>
      {children}
    </button>
  );
}

/**
 * Search over every word said on stage. Results are the moments themselves,
 * each linking into the talk at that second. Opens with ⌘K or "/".
 */
export function GoatSearch({ index }: { index: Record<string, { year: Year; slug: string }> }) {
  const pathname = usePathname() ?? "/";
  const dialect = pathname.startsWith("/2025") ? "y25" : "y26";
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"all" | Year>("all");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "/" && !open && !(e.target as HTMLElement)?.closest("input,textarea")) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("goat:search", onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("goat:search", onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setHits(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, search_mode: "settled" }),
          signal: ctrl.signal,
        });
        const json = await r.json();
        setHits((json.hits ?? []) as Hit[]);
      } catch {
        /* aborted or offline */
      } finally {
        setBusy(false);
      }
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  if (!open) return null;

  const moments = (hits ?? [])
    .flatMap((h) =>
      h.segments
        .filter((s) => s.matched_in_text !== false)
        .slice(0, 2)
        .map((s) => ({ hit: h, seg: s, at: index[h.video_id] }))
    )
    .filter((m) => m.at && (scope === "all" || m.at.year === scope));

  return (
    <div className={`g-search ${dialect}`} role="dialog" aria-label="Search what was said" onClick={() => setOpen(false)}>
      <div className="g-sbox" onClick={(e) => e.stopPropagation()}>
        <div className="g-sin">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input ref={inputRef} autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search what was said" aria-label="Search what was said" />
          <button type="button" className="esc" onClick={() => setOpen(false)}>esc</button>
        </div>
        <div className="g-scope">
          {(["all", 2025, 2026] as const).map((s) => (
            <button key={s} type="button" className={scope === s ? "on" : ""} onClick={() => setScope(s)}>
              {s === "all" ? "Both years" : s}
            </button>
          ))}
          {hits && <span className="cnt">{busy ? "Listening…" : moments.length === 1 ? "Said once on stage" : `${moments.length} moments`}</span>}
        </div>
        <div className="g-results">
          {moments.map(({ hit, seg, at }, i) => {
            const year = at!.year;
            const title = hit.title.includes(" - ") ? hit.title.slice(0, hit.title.lastIndexOf(" - ")) : hit.title;
            const who = hit.title.includes(" - ") ? hit.title.slice(hit.title.lastIndexOf(" - ") + 3) : "";
            const pct = hit.duration ? Math.min(100, (seg.start_time / hit.duration) * 100) : 0;
            return (
              <Link key={`${hit.short_id}-${i}`} className="g-res" href={`/${year}/${at!.slug}?t=${Math.floor(seg.start_time)}`}>
                <div className="rt">
                  {hit.thumbnail ? <img src={hit.thumbnail} alt="" /> : <div className="noimg" />}
                  <span className="at">{stamp(seg.start_time)}</span>
                  <span className="prog"><i style={{ width: `${pct}%` }} /></span>
                </div>
                <div className="rx">
                  <div className="rm">
                    <span className={year === 2025 ? "tag25" : "tag26"}>{year}</span>
                    {title} {who && <span className="rb">by {who}</span>}
                  </div>
                  <blockquote dangerouslySetInnerHTML={{ __html: `“${safeHighlight((seg.highlighted_text || seg.text || "").replace(/^\.\.\./, "…").replace(/\.\.\.$/, "…"))}”` }} />
                  <div className="rp">Plays from {stamp(seg.start_time)}</div>
                </div>
              </Link>
            );
          })}
          {hits && !busy && moments.length === 0 && <p className="g-none">Nobody said that on stage. Not in so many words.</p>}
        </div>
        {scope !== 2025 && (
          <p className="g-snote"><span className="tag26">2026</span>This year’s talks join the search as they are published.</p>
        )}
      </div>
    </div>
  );
}
