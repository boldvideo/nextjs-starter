"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp, Lock, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROSE_CLASS } from "@/lib/prose";
import { timestampToSeconds } from "@/lib/utils/time";
import { unlock, useArcade } from "@/lib/gym-arcade";
import { COACH_CHAT_RANK, RANKS, rankOf } from "@/lib/gym-ranks";
import { track } from "@/lib/gym-track";
import { GymClipPlayer } from "./gym-clip-player";
import { GymRankMeter } from "./gym-rank";

/**
 * Office hours: chat with the coach about one session. The answer reads the
 * whole session (Bold's video-scoped chat via /api/ask), but playback stays
 * clips: every [mm:ss] the coach points to becomes an instant replay of the
 * thought around that second, never the full session. Unlocks at Contender.
 */

interface Message {
  role: "user" | "coach";
  text: string;
}

const STARTERS = [
  "What's the one thing I should take from this session?",
  "How would I apply this to my startup this week?",
  "What do founders usually get wrong here?",
];

// [15:40], [15:40-16:11], [04:42, 18:10]
const STAMP = /\d{1,2}:\d{2}(?::\d{2})?/;
const STAMPS = new RegExp(
  `\\[(${STAMP.source}(?:\\s*[-–]\\s*${STAMP.source})?(?:\\s*[,;]\\s*${STAMP.source}(?:\\s*[-–]\\s*${STAMP.source})?)*)\\]`,
  "g"
);

function secondsToClock(t: number): string {
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = String(Math.floor(t % 60)).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** Timestamps → links the renderer turns into replay chips. */
function withReplays(text: string): string {
  return text.replace(STAMPS, (_, inner: string) =>
    inner
      .split(/\s*[,;]\s*/)
      .map((part) => {
        const start = part.split(/\s*[-–]\s*/)[0];
        return `[${start}](#t=${timestampToSeconds(start)})`;
      })
      .join(" ")
  );
}

export function GymCoachChat({
  videoId,
  playbackId,
  title,
  coachSlug,
  coachName,
}: {
  videoId: string;
  playbackId: string;
  title: string;
  coachSlug: string | null;
  coachName: string | null;
}) {
  const { xp } = useArcade();
  const [ready, setReady] = useState(false);
  // XP is per browser: only known after hydration
  useEffect(() => setReady(true), []);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replay, setReplay] = useState<{ message: number; seconds: number } | null>(null);
  const conversation = useRef<{ id: string; owner: string | null } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const who = coachName ?? "the coach";
  const unlocked = rankOf(xp).index >= COACH_CHAT_RANK;

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setInput("");
    setError(null);
    setBusy(true);
    const index = messages.length + 1;
    setMessages((m) => [...m, { role: "user", text: q }, { role: "coach", text: "" }]);
    if (messages.length === 0) unlock("office-hours");
    track("Coach chat question", { coach: coachSlug ?? "guest" });

    const append = (delta: string) =>
      setMessages((m) => m.map((msg, i) => (i === index ? { ...msg, text: msg.text + delta } : msg)));

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          videoId,
          subdomain: "",
          conversationId: conversation.current?.id ?? null,
          ownerToken: conversation.current?.owner ?? null,
        }),
      });
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => null))?.message ?? "The coach stepped out.");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "chunk" && data.content) append(data.content);
            if (data.type === "done" && data.conversation_id) {
              conversation.current = { id: data.conversation_id, owner: data.owner_token ?? null };
            }
            if (data.type === "error") throw new Error(data.content || "The coach stepped out.");
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "The coach stepped out.");
      setMessages((m) => (m[index]?.text ? m : m.slice(0, index)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="coach" className="mt-12 scroll-mt-24" aria-labelledby="coach-chat">
      {/* The coach's face is already on the page, next to the title */}
      <h2 id="coach-chat" className="font-display uppercase text-[18px] md:text-[20px] leading-none text-foreground">
        Ask {who}
      </h2>

      {!ready ? (
        <div className="mt-5 h-40 rounded-xl border border-[var(--gym-line)]" aria-hidden />
      ) : !unlocked ? (
        <div className="mt-5 mb-12 rounded-xl border border-dashed border-[var(--gym-line)] p-5">
          <p className="flex items-center gap-2 font-osd text-[19px] leading-none text-[var(--gym-yellow)]">
            <Lock className="h-4 w-4" /> LOCKED · UNLOCKS AT {RANKS[COACH_CHAT_RANK].name.toUpperCase()}
          </p>
          <GymRankMeter className="mt-4 max-w-[520px]" />
          <Link
            href="/"
            className="mt-4 inline-flex items-center h-11 px-5 rounded-xl font-display text-[14px] uppercase text-[#1a0616] bg-[linear-gradient(90deg,var(--gym-yellow),var(--gym-orange),var(--gym-pink))]"
          >
            Play a level
          </Link>
        </div>
      ) : (
        <div className="mt-5">
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="rounded-full border border-[var(--gym-line)] px-3.5 py-2 text-left text-[14px] text-foreground/90 hover:border-[var(--gym-cyan)] hover:text-[var(--gym-cyan)] cursor-pointer transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <ol className="space-y-6">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <li key={i} className="flex justify-end">
                  <p className="max-w-[80%] rounded-2xl rounded-br-md bg-white/[0.07] px-4 py-2.5 text-[15.5px] text-foreground">{m.text}</p>
                </li>
              ) : (
                <li key={i}>
                  <div className="min-w-0">
                    {m.text ? (
                      <div
                        className={cn(
                          PROSE_CLASS,
                          "max-w-[62ch] prose-p:text-[16.5px] prose-p:leading-[1.7] prose-li:text-[16.5px] prose-p:my-3 first:prose-p:mt-0",
                          busy && i === messages.length - 1 && "chat-stream-cursor"
                        )}
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ href, children }) => {
                              const t = href?.startsWith("#t=") ? Number(href.slice(3)) : NaN;
                              if (!Number.isFinite(t)) {
                                return (
                                  <a href={href} target="_blank" rel="noopener noreferrer">
                                    {children}
                                  </a>
                                );
                              }
                              const on = replay?.message === i && replay.seconds === t;
                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplay(on ? null : { message: i, seconds: t });
                                    if (!on) {
                                      unlock("replay");
                                      track("Clip played", { from: "coach-chat" });
                                    }
                                  }}
                                  className={cn(
                                    "not-prose inline-flex items-center gap-1 mx-0.5 px-1.5 h-6 align-[1px] rounded font-osd text-[16px] leading-none cursor-pointer transition-colors",
                                    on ? "bg-[var(--gym-cyan)] text-[#06121a]" : "bg-[var(--gym-cyan)]/12 text-[var(--gym-cyan)] hover:bg-[var(--gym-cyan)]/25"
                                  )}
                                >
                                  <Play className="h-2.5 w-2.5 fill-current" />
                                  {children}
                                </button>
                              );
                            },
                          }}
                        >
                          {withReplays(m.text)}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="font-osd text-[18px] text-muted-foreground gym-blink">{who.toUpperCase()} IS THINKING…</p>
                    )}
                    {replay?.message === i && (
                      <div className="mt-4 max-w-[560px] rounded-xl overflow-hidden border border-[var(--gym-cyan)] shadow-[0_0_32px_-8px_var(--gym-cyan)] bg-black">
                        <GymClipPlayer
                          key={replay.seconds}
                          moment={{ videoId, startMs: replay.seconds * 1000 }}
                          playbackId={playbackId}
                          title={title}
                          className="aspect-video"
                        />
                        <div className="flex items-center justify-between gap-3 pl-3 pr-1 py-1 bg-[var(--gym-night-2)]">
                          <span className="font-osd text-[17px] leading-none text-[var(--gym-cyan)]">▶ {secondsToClock(replay.seconds)}</span>
                          <button
                            type="button"
                            onClick={() => setReplay(null)}
                            aria-label="Close clip"
                            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-white/[0.06] hover:text-foreground cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              )
            )}
          </ol>

          {error && <p className="mt-4 text-[14px] text-[var(--gym-pink)]">{error}</p>}

          {/* Pinned to the bottom, like the answer page's chat bar */}
          <div className="sticky bottom-0 z-10 -mx-4 mt-6 px-4 pt-3 pb-4 md:pb-6 bg-[linear-gradient(to_top,var(--gym-night)_70%,transparent)]">
          <form
            ref={formRef}
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="flex items-end gap-2 rounded-3xl border border-[var(--gym-line)] bg-[var(--gym-night-2)] py-1.5 pl-2 pr-1.5 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.8)] transition-colors focus-within:border-[var(--gym-cyan)]"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  formRef.current?.requestSubmit();
                }
              }}
              rows={1}
              maxLength={1000}
              placeholder={messages.length ? `Follow up with ${who}…` : `Ask ${who} anything about this session…`}
              aria-label={`Ask ${who} about this session`}
              className="min-h-10 max-h-40 flex-1 resize-none bg-transparent px-2.5 py-2 text-[16px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none field-sizing-content"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Ask"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-foreground text-[var(--gym-night)] transition-opacity disabled:opacity-25 cursor-pointer disabled:cursor-default"
            >
              <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </form>
          </div>
        </div>
      )}
    </section>
  );
}
