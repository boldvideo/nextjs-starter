"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Minus, Plus, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { dropQuest, moveQuest, stepQuest, useArcade, type Quest, type QuestStatus } from "@/lib/gym-arcade";
import { track } from "@/lib/gym-track";
import { GymRankLadder, GymRankMeter } from "./gym-rank";

/**
 * The quest log: every next step a player saved, on a three-column board
 * (Up next → Doing → Done), so a quest that takes a week brings them back.
 * Above it, their rank and what the next one unlocks. Per browser for now,
 * like the rest of the arcade state.
 */

const COLUMNS: { status: QuestStatus; title: string; empty: string; tone: string }[] = [
  { status: "next", title: "Up next", empty: "Save a quest from any answer and it lands here.", tone: "var(--gym-yellow)" },
  { status: "doing", title: "Doing", empty: "Start a quest to track it here.", tone: "var(--gym-cyan)" },
  { status: "done", title: "Done", empty: "Finished quests pay 100 XP.", tone: "var(--gym-pink)" },
];

export function GymQuestBoard() {
  const { quests } = useArcade();
  // localStorage: the board only exists after hydration
  const [ready, setReady] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration flag
  useEffect(() => setReady(true), []);

  return (
    <div className="max-w-[1180px] mx-auto px-4 md:px-6 py-8 md:py-12">
      <p className="font-osd text-[19px] leading-none text-[var(--gym-cyan)]">QUEST LOG</p>
      <h1 className="mt-2 font-display uppercase text-[30px] md:text-[42px] leading-none text-foreground">Your quests</h1>
      <p className="mt-3 max-w-[56ch] text-[16px] text-muted-foreground">
        Every answer ends with a quest. Most take a few days. Save them here, count your reps, and come back to finish
        them. Finished quests pay XP, and XP ranks you up.
      </p>

      <GymRankMeter className="mt-7 max-w-[560px]" />

      <section className="mt-10" aria-label="Quest board">
        {ready && quests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--gym-line)] p-8 text-center">
            <p className="font-osd text-[20px] text-muted-foreground">NO QUESTS SAVED YET</p>
            <p className="mt-2 text-[15px] text-muted-foreground">Ask a question, then hit &ldquo;Save quest&rdquo; on the answer&apos;s next quest.</p>
            <Link
              href="/"
              className="mt-5 inline-flex items-center h-11 px-5 rounded-xl font-display text-[14px] uppercase text-[#1a0616] bg-[linear-gradient(90deg,var(--gym-yellow),var(--gym-orange),var(--gym-pink))]"
            >
              Play a level
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {COLUMNS.map((col) => {
              const list = ready ? quests.filter((q) => q.status === col.status) : [];
              return (
                <div key={col.status} className="min-w-0">
                  <div className="flex items-baseline justify-between border-b-2 pb-2 mb-3" style={{ borderColor: col.tone }}>
                    <h2 className="font-display text-[14px] uppercase" style={{ color: col.tone }}>{col.title}</h2>
                    <span className="font-osd text-[18px] leading-none text-muted-foreground tabular-nums">{list.length}</span>
                  </div>
                  {list.length === 0 ? (
                    <p className="px-1 py-3 text-[13.5px] text-muted-foreground/70">{col.empty}</p>
                  ) : (
                    <ul className="space-y-3">
                      {list.map((q) => (
                        <QuestCard key={q.id} quest={q} />
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-14" aria-labelledby="ranks">
        <h2 id="ranks" className="font-display uppercase text-[22px] md:text-[26px] leading-none text-foreground">What XP gets you</h2>
        <p className="mt-2 mb-5 text-[15px] text-muted-foreground">Asking, watching the proof, roasting and finishing quests all pay XP. Each rank unlocks something.</p>
        <GymRankLadder />
      </section>
    </div>
  );
}

function QuestCard({ quest }: { quest: Quest }) {
  const iconButton =
    "grid place-items-center h-8 w-8 rounded-md border border-[var(--gym-line)] text-muted-foreground hover:text-foreground hover:border-foreground/40 cursor-pointer transition-colors";
  const action =
    "inline-flex items-center gap-1.5 h-8 px-3 rounded-md font-display text-[11px] uppercase cursor-pointer transition-colors active:scale-95";

  const move = (status: QuestStatus) => {
    moveQuest(quest.id, status);
    track("Quest moved", { to: status });
  };
  const step = (delta: number) => {
    stepQuest(quest.id, delta);
    if (delta > 0 && quest.target && quest.progress + delta >= quest.target) move("done");
  };

  return (
    <li
      className={cn(
        "group rounded-xl border bg-[var(--gym-night-2)] p-3.5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300",
        quest.status === "done" ? "border-[var(--gym-line)] opacity-80" : "border-[var(--gym-line)] hover:border-foreground/25"
      )}
    >
      <div className="flex items-start gap-2.5">
        <Image
          src={quest.coach ? `/gym/game/cast/${quest.coach}.webp` : "/gym/game/game-master-bot.webp"}
          alt=""
          width={28}
          height={28}
          className="h-7 w-7 shrink-0"
        />
        <p className={cn("min-w-0 flex-1 text-[14.5px] leading-snug text-foreground/90", quest.status === "done" && "line-through decoration-[var(--gym-pink)]/60")}>
          {quest.text}
        </p>
        <button type="button" onClick={() => dropQuest(quest.id)} aria-label="Remove quest" className="shrink-0 -mr-1 -mt-1 grid place-items-center h-7 w-7 rounded-md text-muted-foreground/50 hover:text-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 cursor-pointer">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {quest.target && quest.status !== "next" && (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${Math.min(quest.target, 20)}, minmax(0, 1fr))` }}>
            {Array.from({ length: Math.min(quest.target, 20) }, (_, i) => (
              <span
                key={i}
                className={cn("h-2", i < Math.round((quest.progress / quest.target!) * Math.min(quest.target!, 20)) ? "bg-[var(--gym-cyan)]" : "bg-white/[0.08]")}
              />
            ))}
          </div>
          <span className="font-osd text-[18px] leading-none text-foreground tabular-nums">
            {quest.progress}/{quest.target}
          </span>
          {quest.status === "doing" && (
            <>
              <button type="button" onClick={() => step(-1)} aria-label="One less" className={iconButton} disabled={quest.progress === 0}>
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => step(1)} aria-label="One more done" className={cn(iconButton, "text-[var(--gym-cyan)] border-[var(--gym-cyan)]/50")}>
                <Plus className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {quest.status === "next" && (
          <button type="button" onClick={() => move("doing")} className={cn(action, "border border-[var(--gym-cyan)] text-[var(--gym-cyan)] hover:bg-[var(--gym-cyan)] hover:text-[#06121a]")}>
            Start <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
        {quest.status === "doing" && (
          <>
            <button type="button" onClick={() => move("next")} aria-label="Back to up next" className={iconButton}>
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => move("done")} className={cn(action, "bg-[var(--gym-pink)] text-white hover:brightness-110")}>
              <Check className="h-3.5 w-3.5" strokeWidth={3} /> Done {quest.paid ? "" : "· +100 XP"}
            </button>
          </>
        )}
        {quest.status === "done" && (
          <>
            <span className="font-osd text-[16px] leading-none text-[var(--gym-pink)]">
              CLEARED {quest.doneAt ? new Date(quest.doneAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase() : ""}
            </span>
            <button type="button" onClick={() => move("doing")} aria-label="Reopen quest" className={cn(iconButton, "ml-auto")}>
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        {quest.link && quest.status !== "done" && (
          <Link href={quest.link} className="ml-auto text-[12.5px] font-semibold text-muted-foreground hover:text-foreground">
            The answer →
          </Link>
        )}
      </div>
    </li>
  );
}
