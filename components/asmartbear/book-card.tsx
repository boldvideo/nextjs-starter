"use client";

import React from "react";
import Image from "next/image";
import { track } from "@/lib/asmartbear/track";

const BOOK_URL = "https://hiddenmultipliers.com";

const CHAPTERS: Record<number, string> = {
  1: "The Profit Whale’s Tail",
  2: "Carol Loves You For You",
  3: "Speaking Carol Into Existence",
  4: "A Rose By Any Other Name",
  5: "Price Is Just a Number",
  6: "Price Is Not Just a Number",
  7: "And After All That, They Left",
  8: "Splitting the Surplus",
  9: "Your False-Positives Factory",
  10: "A Multiplier of One’s Own",
  11: "To Thine Own Self Be True",
};

function textOf(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (React.isValidElement(node)) {
    return textOf((node.props as { children?: React.ReactNode }).children);
  }
  return "";
}

/**
 * The persona ends some answers with one line like
 * "Go deeper: Hidden Multipliers, ch. 7, 'And After All That, They Left'."
 * Returns the chapter number when a paragraph is exactly that line.
 */
export function bookChapterOf(children: React.ReactNode): number | null {
  const text = textOf(children).trim();
  if (text.length > 160) return null;
  if (!/^go deeper\b/i.test(text) || !/hidden multipliers/i.test(text)) return null;
  const m = text.match(/\bch(?:apter|\.)?\s*(\d{1,2})\b/i);
  const n = m ? Number(m[1]) : NaN;
  return CHAPTERS[n] ? n : null;
}

export function BookCard({ chapter }: { chapter: number }) {
  return (
    <a
      href={BOOK_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("Book card", { chapter: `Ch ${chapter}: ${CHAPTERS[chapter]}` })}
      className="not-prose group my-4 flex items-center gap-3 rounded-xl border border-[#152A45]/15 bg-[#152A45] p-3 pr-4 text-white no-underline transition-colors hover:bg-[#1d375a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6A31A]"
    >
      <Image
        src="/asmartbear/hidden-multipliers-3d.png"
        alt=""
        width={44}
        height={60}
        className="h-[60px] w-auto shrink-0 drop-shadow"
      />
      <span className="min-w-0 flex-1 leading-snug">
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#D6A31A]">
          Go deeper · Chapter {chapter}
        </span>
        <span className="block font-serif text-[15px] font-bold">{CHAPTERS[chapter]}</span>
        <span className="block text-xs text-white/70">Hidden Multipliers by Jason Cohen</span>
      </span>
      <span
        aria-hidden="true"
        className="shrink-0 text-sm font-semibold text-[#D6A31A] transition-transform group-hover:translate-x-0.5"
      >
        Get the book →
      </span>
    </a>
  );
}
