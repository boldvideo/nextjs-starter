"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BoldPlayer, type BoldPlayerHandle, type BoldPlayerVideo } from "@boldvideo/player";
import type { MuxPlayerVideoLike } from "@/components/players/player-mux";
import { useBold } from "@/components/providers/bold-provider";
import { useVideoProgress } from "@/hooks/use-video-progress";

interface Word {
  start: number;
  end: number;
  word?: string;
  text?: string;
}

interface Utterance {
  start: number;
  end: number;
  text: string;
  speaker?: string;
  speaker_name?: string;
  words?: Word[];
}

/** One readable paragraph: a slice of a speaker turn, with its own start time. */
interface Para {
  start: number;
  text: string;
  speaker: string;
}

const SENTENCE_END = /[.?!…]["”’)]?$/;

/**
 * Speaker turns from the vendor can run for minutes. Break each turn into
 * paragraphs using the word timings: after a sentence that ends on a pause, or
 * once a paragraph has grown long, a new one starts. Every paragraph keeps its
 * own timestamp so it can be clicked and followed.
 */
function toParagraphs(utterances: Utterance[], names: Record<string, string | null>): Para[] {
  const out: Para[] = [];
  for (const u of utterances) {
    const label = u.speaker ?? "";
    const speaker = names[label] || u.speaker_name || label;
    const words = (u.words ?? []).filter((w) => (w.word ?? w.text ?? "").trim());
    if (words.length === 0) {
      if (u.text?.trim()) out.push({ start: u.start, text: u.text.trim(), speaker });
      continue;
    }
    let buf: string[] = [];
    let start = words[0].start;
    let sentences = 0;
    words.forEach((w, i) => {
      const token = (w.word ?? w.text ?? "").trim();
      buf.push(token);
      const next = words[i + 1];
      if (!SENTENCE_END.test(token)) return;
      sentences += 1;
      const pause = next ? next.start - w.end : 0;
      const long = buf.length >= 55;
      const breathe = pause >= 0.9 && buf.length >= 18;
      const tooLong = buf.length >= 110;
      if (!next || ((long || breathe) && sentences >= 2) || tooLong) {
        out.push({ start, text: buf.join(" "), speaker });
        buf = [];
        sentences = 0;
        if (next) start = next.start;
      }
    });
    if (buf.length) out.push({ start, text: buf.join(" "), speaker });
  }
  return out;
}

function stamp(seconds: number): string {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
}

export interface WatchVideo extends MuxPlayerVideoLike {
  duration: number;
  transcriptUrl?: string | null;
}

/**
 * Player + the spoken words under it. Clicking a line plays from there; the
 * line being spoken stays lit. Resume position comes from watch progress.
 */
export function Watch({
  video,
  startTime,
  dialect,
  meta,
  aside,
  pendingText,
}: {
  video: WatchVideo;
  startTime?: number;
  dialect: "y25" | "y26";
  meta: React.ReactNode;
  aside: React.ReactNode;
  pendingText: string;
}) {
  const playerRef = useRef<BoldPlayerHandle | null>(null);
  const bold = useBold();
  const [now, setNow] = useState(0);
  const [lines, setLines] = useState<Para[] | null>(null);
  const [follow, setFollow] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);

  const { resumePosition } = useVideoProgress({
    videoId: video.id,
    duration: video.duration,
    // The handle is shaped like a media element (currentTime, duration, events).
    playerRef: playerRef as unknown as React.RefObject<HTMLVideoElement | null>,
  });
  const effectiveStart = startTime || resumePosition || undefined;

  useEffect(() => {
    if (effectiveStart && playerRef.current) playerRef.current.currentTime = effectiveStart;
  }, [effectiveStart]);

  useEffect(() => {
    if (!video.transcriptUrl) return;
    let cancelled = false;
    fetch(video.transcriptUrl)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled || !json) return;
        const u: Utterance[] = json.utterances ?? [];
        const names: Record<string, string | null> = json.metadata?.speakers ?? {};
        setLines(toParagraphs(u.filter((x) => x.text?.trim()), names));
      })
      .catch(() => setLines([]));
    return () => {
      cancelled = true;
    };
  }, [video.transcriptUrl]);

  const onTimeUpdate = useCallback((e: Event) => {
    const t = (e.target as HTMLVideoElement | null)?.currentTime;
    if (typeof t === "number") setNow(t);
  }, []);

  const current = useMemo(() => {
    if (!lines) return -1;
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].start <= now) idx = i;
      else break;
    }
    return idx;
  }, [lines, now]);

  useEffect(() => {
    if (!follow || current < 0 || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-i="${current}"]`);
    if (!el) return;
    const box = listRef.current.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (r.top < box.top || r.bottom > box.bottom) {
      listRef.current.scrollTo({ top: el.offsetTop - listRef.current.offsetTop - 80, behavior: "smooth" });
    }
  }, [current, follow]);

  const seek = (t: number) => {
    if (!playerRef.current) return;
    playerRef.current.currentTime = t;
    void playerRef.current.play();
    setFollow(true);
  };

  const speakerOf = (p: Para) => p.speaker;
  const named = (s: string) => s.length > 2; // bare diarization labels stay unnamed

  return (
    <div className={`g-watch is-${dialect}`}>
      <div className="g-main">
        <div className="g-player">
          <BoldPlayer
            ref={playerRef}
            video={video as unknown as BoldPlayerVideo}
            bold={bold}
            startTime={effectiveStart}
            onTimeUpdate={onTimeUpdate}
            accentColor={dialect === "y25" ? "#ff00ff" : "#ff914d"}
            style={
              {
                "--media-font-family": dialect === "y25" ? "var(--g-bricolage)" : "var(--g-fraunces)",
                "--media-border-radius": dialect === "y25" ? "7px" : "0px",
              } as React.CSSProperties
            }
          />
        </div>
        <div className="g-meta">{meta}</div>
        <section className="g-spoken">
          <h3>Transcript</h3>
          {lines === null && !video.transcriptUrl && <p className="g-pending">{pendingText}</p>}
          {lines === null && video.transcriptUrl && <div className="g-ghost"><i /><i /><i /><i /></div>}
          {lines && lines.length > 0 && (
            <div className="g-lines" ref={listRef} onWheel={() => setFollow(false)} onTouchMove={() => setFollow(false)}>
              {lines.map((u, i) => {
                const sp = speakerOf(u);
                const showSpeaker = named(sp) && (i === 0 || speakerOf(lines[i - 1]) !== sp);
                return (
                  <p key={i} data-i={i} className={i === current ? "now" : ""} onClick={() => seek(u.start)}>
                    <span className="ts">{stamp(u.start)}</span>
                    <span className="tx">
                      {showSpeaker && <b className="sp">{sp}</b>}
                      {u.text}
                    </span>
                  </p>
                );
              })}
            </div>
          )}
        </section>
      </div>
      <aside className="g-aside">{aside}</aside>
    </div>
  );
}
