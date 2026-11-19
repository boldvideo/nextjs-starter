"use client";

import React from "react";
import Link from "next/link";
import { EPISODE_INDEX, mentionedEpisodes } from "@/lib/shiftai/episode-index";
import { track } from "@/lib/shiftai/track";
import { Face } from "./face";

/** A guest named in an answer: a link to their episode that reads like a reference. */
export function EpisodeLink({ num, children }: { num: string; children: React.ReactNode }) {
  const ep = EPISODE_INDEX[num];
  if (!ep?.slug) return <>{children}</>;
  return (
    <Link
      href={`/v/${ep.slug}`}
      onClick={() => track("Episode link", { episode: `E${ep.number}`, company: ep.company })}
      title={`Episode ${ep.number} · ${ep.guest}, ${ep.company}`}
      className="font-normal text-foreground underline decoration-acid/60 decoration-1 underline-offset-[4px] transition-colors hover:text-acid"
    >
      {children}
    </Link>
  );
}

/** The episodes an answer draws on, as cards under it. */
export function EpisodeCards({ text, narrow = false }: { text: string; narrow?: boolean }) {
  const keys = mentionedEpisodes(text).slice(0, 3);
  if (!keys.length) return null;
  return (
    <div className="not-prose mt-6">
      <p className="sx-label mb-2.5 !text-[10px] text-dim">{keys.length === 1 ? "The episode" : "The episodes"}</p>
      <div className={`grid grid-cols-1 gap-px border border-border bg-border ${narrow ? "" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
        {keys.map((key) => {
          const ep = EPISODE_INDEX[key];
          return (
            <Link
              key={key}
              href={`/v/${ep.slug}`}
              onClick={() => track("Episode card", { episode: `E${ep.number}`, company: ep.company })}
              className="group flex items-center gap-3 bg-background p-3 no-underline transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-acid"
            >
              <Face slug={ep.guestSlug} name={ep.guest} size={40} />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="sx-label block !text-[10px] text-dim transition-colors group-hover:text-acid">
                  Episode {String(ep.number).padStart(2, "0")} · {ep.company}
                </span>
                <span className="mt-1 block truncate text-[14px] text-foreground">{ep.guest}</span>
                <span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground">{ep.headline}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
