import React from "react";
import Link from "next/link";
import { EPISODE_INDEX, mentionedEpisodes } from "@/lib/asmartbear/episode-index";

/** Inline "E10 (Mindstamp)" in an answer: a link that reads like a reference. */
export function EpisodeLink({ num, children }: { num: string; children: React.ReactNode }) {
  const ep = EPISODE_INDEX[num];
  if (!ep) return <>{children}</>;
  return (
    <Link
      href={`/v/${ep.slug}`}
      title={`${num} · ${ep.company} with ${ep.founders.join(" & ")}`}
      className="font-semibold text-[#3f5631] no-underline underline-offset-[3px] decoration-[#577544]/50 hover:underline dark:text-[#a9c294]"
    >
      {children}
    </Link>
  );
}

function names(list: string[]) {
  return list.join(" & ");
}

/** The episodes an answer names, as cards under it. */
export function EpisodeCards({ text, narrow = false }: { text: string; narrow?: boolean }) {
  const nums = mentionedEpisodes(text).slice(0, 3);
  if (!nums.length) return null;
  return (
    <div className="not-prose mt-5">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {nums.length === 1 ? "The episode" : "The episodes"}
      </p>
      <div className={`grid grid-cols-1 gap-2 ${narrow ? "" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
        {nums.map((num) => {
          const ep = EPISODE_INDEX[num];
          return (
            <Link
              key={num}
              href={`/v/${ep.slug}`}
              className="group flex items-center gap-3 rounded-xl border border-border bg-background p-2 pr-3 no-underline transition-colors hover:border-[#577544]/50 hover:bg-[#577544]/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#577544]"
            >
              <span className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                {ep.youtubeId && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`https://i.ytimg.com/vi/${ep.youtubeId}/mqdefault.jpg`}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                  />
                )}
                <span className="absolute left-1 top-1 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
                  {num}
                </span>
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-sm font-semibold text-foreground">{ep.company}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {names(ep.founders)}
                  {ep.cohosts.length > 0 && ` · w/ ${names(ep.cohosts)}`}
                </span>
                {ep.faces.length > 0 && (
                  <span className="mt-1.5 flex -space-x-1.5">
                    {ep.faces.slice(0, 3).map((src) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={src}
                        src={`${src}?w=48&h=48&fit=crop`}
                        alt=""
                        loading="lazy"
                        className="h-5 w-5 rounded-full object-cover ring-2 ring-background"
                      />
                    ))}
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
