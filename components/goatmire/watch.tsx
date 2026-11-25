"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Player } from "@/components/players";
import type { MuxPlayerVideoLike } from "@/components/players/player-mux";
import { useVideoProgress } from "@/hooks/use-video-progress";

interface Utterance {
  start: number;
  end: number;
  text: string;
  speaker?: string;
  speaker_name?: string;
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
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const [now, setNow] = useState(0);
  const [lines, setLines] = useState<Utterance[] | null>(null);
  const [follow, setFollow] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);

  const { resumePosition } = useVideoProgress({
    videoId: video.id,
    duration: video.duration,
    playerRef,
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
        setLines(u.filter((x) => x.text?.trim()));
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

  const speakerOf = (u: Utterance) => u.speaker_name || u.speaker || "";
  const named = (s: string) => s.length > 2; // bare diarization labels stay unnamed

  return (
    <div className={`g-watch is-${dialect}`}>
      <div className="g-main">
        <div className="g-player">
          <Player
            video={video}
            ref={playerRef}
            autoPlay={false}
            startTime={effectiveStart}
            onTimeUpdate={onTimeUpdate}
            className="w-full h-full"
          />
        </div>
        <div className="g-meta">{meta}</div>
        <section className="g-spoken">
          <h3>{dialect === "y26" ? "Spoken" : "Transcript"}</h3>
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
