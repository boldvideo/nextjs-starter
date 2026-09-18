"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVideoVoice } from "@/components/video/chat/voice-provider";

export function VoiceBar() {
  const voice = useVideoVoice();
  const barRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLSpanElement>(null);
  const [speaking, setSpeaking] = useState(false);
  const getLevels = voice?.getLevels;

  useEffect(() => {
    if (barRef.current?.getClientRects().length) barRef.current.focus();
  }, []);

  useEffect(() => {
    if (!getLevels) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let lastSpeech = -Infinity;
    let wasSpeaking = false;
    const sample = (now: number) => {
      const { input, output } = getLevels();
      if (output > 0.02) lastSpeech = now;
      const isSpeaking = now - lastSpeech < 1200;
      if (isSpeaking !== wasSpeaking) {
        setSpeaking(isSpeaking);
        wasSpeaking = isSpeaking;
      }
      if (orbRef.current) {
        const amplitude = Math.min(1, Math.max(input, output) * 5);
        orbRef.current.style.transform = reducedMotion.matches ? "none" : `scale(${1 + amplitude * 0.35})`;
      }
      frame = requestAnimationFrame(sample);
    };
    frame = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(frame);
  }, [getLevels]);

  if (!voice) return null;
  let label = "Listening…";
  if (voice.status === "connecting") label = "Connecting…";
  else if (voice.status === "ending") label = "Ending voice…";
  else if (voice.videoPlaying) label = "Video playing";
  else if (speaking) label = "Speaking…";
  else if (voice.muted) label = "Microphone muted";

  let hint = "Ask about this video";
  if (voice.videoPlaying) hint = "Voice resumes when you pause";
  else if (voice.status === "connecting") hint = "Allow microphone access if asked";
  else if (voice.muted) hint = "You can still hear the assistant";
  const buttonClass = "flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors disabled:opacity-40";

  return (
    <div ref={barRef} role="group" aria-label="Voice conversation" tabIndex={-1}
      className="flex items-center gap-2 rounded-2xl border border-border bg-muted/40 p-2 outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center" aria-hidden="true">
        <span ref={orbRef} className={cn("block h-5 w-5 rounded-full", voice.status === "live" && !voice.videoPlaying ? "bg-primary" : "bg-muted-foreground/40")} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-5">{label}</p>
        <p className="text-xs leading-4 text-muted-foreground">{hint}</p>
      </div>
      <button type="button" className={cn(buttonClass, "text-foreground hover:bg-muted", voice.muted && "bg-muted")}
        onClick={voice.toggleMuted} disabled={voice.status !== "live"}
        aria-label={voice.muted ? "Unmute microphone" : "Mute microphone"} aria-pressed={voice.muted}>
        {voice.muted ? <MicOff size={18} aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />}
      </button>
      <button type="button" onClick={voice.end} aria-label="End voice conversation" disabled={voice.status === "ending"}
        className={cn(buttonClass, "bg-destructive/10 text-destructive hover:bg-destructive/20")}>
        <PhoneOff size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
