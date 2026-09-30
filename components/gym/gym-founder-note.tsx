"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The tonal escape hatch. The gym is loud on purpose; FounderWell is not a
 * hustle-culture brand. A spinning "WTF?" sticker on the hero opens a calm
 * letter from Vanessa in FounderWell's own look (paper, navy, teal), saying
 * what this is (a Bold technology demo on real FounderWell sessions) and
 * what FounderWell actually stands for.
 *
 * Open it from anywhere with `openFounderNote()`, or link to `#note`.
 *
 * DRAFT COPY: written in Vanessa's voice for her to rewrite and approve
 * before launch.
 */

const OPEN_EVENT = "gym:open-note";
const HASH = "#note";

export function openFounderNote() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/** Spinning starburst sticker. Placement is up to the parent. */
export function GymNoteSticker({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={openFounderNote}
      aria-label="Wait, what is this? A note from FounderWell"
      className={cn("group relative h-[96px] w-[96px] cursor-pointer", className)}
    >
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full drop-shadow-[0_0_18px_rgba(255,210,63,0.55)] motion-safe:animate-[spin_14s_linear_infinite] group-hover:[animation-duration:3s]"
        aria-hidden
      >
        <polygon
          fill="#ffd23f"
          stroke="#1a0616"
          strokeWidth="2.5"
          strokeLinejoin="round"
          points={Array.from({ length: 24 }, (_, i) => {
            const r = i % 2 === 0 ? 48 : 38;
            const a = (Math.PI * 2 * i) / 24 - Math.PI / 2;
            return `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`;
          }).join(" ")}
        />
      </svg>
      <span className="relative flex h-full w-full flex-col items-center justify-center -rotate-12 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6">
        <span className="font-display text-[18px] md:text-[23px] leading-none text-[#1a0616]">WTF?</span>
        <span className="mt-0.5 text-[9px] md:text-[10px] font-bold uppercase tracking-wide text-[#1a0616]/80 leading-none">read me</span>
      </span>
    </button>
  );
}

/** The letter itself. Mount once per page. */
export function GymFounderNote() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    if (window.location.hash === HASH) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const fromHash = () => {
      if (window.location.hash === HASH) setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    window.addEventListener("hashchange", fromHash);
    fromHash();
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      window.removeEventListener("hashchange", fromHash);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-3 md:p-8 bg-[rgba(6,3,14,0.78)] backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-labelledby="founder-note-title"
    >
      <article
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[640px] my-auto rounded-2xl bg-[#fbfaf7] text-[#123644] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)] motion-safe:animate-in motion-safe:zoom-in-[0.97] motion-safe:slide-in-from-bottom-4 motion-safe:duration-300"
      >
        <div className="h-1.5 rounded-t-2xl bg-[#00a4bd]" />
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-4 h-9 w-9 grid place-items-center rounded-full text-[#33475b] hover:bg-[#123644]/[0.06] cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="px-6 md:px-12 pt-8 md:pt-10 pb-8 md:pb-10">
          <div className="flex items-center gap-2 text-[#00a4bd]">
            <Image src="/gym/founderwell-mark-teal.svg" alt="" width={22} height={22} className="h-[22px] w-[22px]" />
            <span className="text-sm font-semibold tracking-wide">FounderWell</span>
          </div>

          <h2 id="founder-note-title" className="mt-6 font-heading text-[26px] md:text-[32px] font-bold leading-tight tracking-[-0.01em] text-[#123644]">
            Wait, what is this?
          </h2>

          <div className="mt-5 space-y-4 text-[16.5px] leading-[1.75] text-[#33475b]">
            <p>
              You just walked into a neon gym full of bro talk. Let me explain.
            </p>
            <p>
              The GTM Gym is a technology demo. Our friends at Bold took real coaching sessions from FounderWell and turned them into a coach you can talk to, one that shows you the exact minute of a real session behind every answer. They dressed it up as a 1987 workout tape because it&apos;s fun, and because going to market really is practice: small reps, done consistently.
            </p>
            <p>
              What it isn&apos;t is hustle culture. At FounderWell we don&apos;t believe in grinding yourself into the ground, skipping sleep, or measuring your worth by your pipeline. We help founders grow their companies without sacrificing what matters most: their health, their relationships, their people.
            </p>
            <p>
              So take the reps. Skip the ego. Rest when you need to. And when the struggle gets heavy, you don&apos;t have to carry it alone. That&apos;s what we&apos;re here for.
            </p>
          </div>

          <p className="mt-6 text-[15px] font-semibold text-[#00a4bd]">
            Be Well. Scale Well. Live Well. Exit Well.
          </p>

          <div className="mt-7 flex items-center gap-4">
            <Image
              src="/gym/vanessa.webp"
              alt="Vanessa Roberts"
              width={64}
              height={64}
              className="h-16 w-16 rounded-full object-cover ring-2 ring-[#00a4bd]/40"
            />
            <div>
              <p className="font-[family-name:var(--font-caveat)] text-[34px] leading-none text-[#123644]">Vanessa</p>
              <p className="mt-1 text-sm text-[#33475b]">Vanessa Roberts, Founder of FounderWell</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between border-t border-[#123644]/10 pt-6">
            <p className="text-[12.5px] leading-snug text-[#8a9dad] max-w-[36ch]">
              P.S. The coaching videos are real FounderWell sessions. The gym, the neon and the sunglasses are imaginary.
            </p>
            <a
              href="https://www.founderwell.com?utm_source=gtm-gym&utm_medium=founder-note"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-11 px-5 rounded-full bg-[#123644] text-white text-sm font-semibold hover:bg-[#047e90] transition-colors whitespace-nowrap"
            >
              Meet FounderWell →
            </a>
          </div>
        </div>
      </article>
    </div>
  );
}
