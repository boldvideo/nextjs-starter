"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import type { VoiceSession, VoiceStatus } from "@boldvideo/bold-js";
import { useBold } from "@/components/providers/bold-provider";
import { useAIAssistantContext } from "@/components/video/chat/context";
import { mergeVoiceCaptions, voiceErrorMessage } from "@/lib/video-voice";

// Additive SDK API in the companion release. 1.27 remains usable during rollout:
// playing a clip ends voice when playback coordination is unavailable.
type PlaybackSession = VoiceSession & {
  setPlaybackState?: (state: { playing: boolean; currentTime: number }) => void;
};

interface VideoVoice {
  enabled: boolean;
  active: boolean;
  status: VoiceStatus;
  muted: boolean;
  videoPlaying: boolean;
  notice: string;
  start: () => void;
  end: () => void;
  toggleMuted: () => void;
  getLevels: VoiceSession["getAudioLevels"];
  observeSurface: (element: HTMLElement) => () => void;
}

const VoiceContext = createContext<VideoVoice | null>(null);
export const useVideoVoice = () => useContext(VoiceContext);

export function VideoVoiceProvider({ children, videoId, enabled, playerRef }: {
  children: ReactNode;
  videoId: string;
  enabled: boolean;
  playerRef: RefObject<HTMLVideoElement | null>;
}) {
  const bold = useBold();
  const { setMessages, isPending } = useAIAssistantContext();
  const sessionRef = useRef<PlaybackSession | null>(null);
  const detachPlayer = useRef<() => void>(() => {});
  const surfaces = useRef(new Set<HTMLElement>());
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [muted, setMuted] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [notice, setNotice] = useState("");
  const active = status === "connecting" || status === "live" || status === "ending";

  const end = useCallback(() => {
    detachPlayer.current();
    void sessionRef.current?.end();
  }, []);

  // Both responsive chat surfaces stay mounted. Measure actual visibility so an
  // inactive sibling cannot end the session owned by the visible composer.
  const observeSurface = useCallback((element: HTMLElement) => {
    surfaces.current.add(element);
    const check = () => {
      if (!Array.from(surfaces.current).some(surface => surface.getClientRects().length > 0 && surface.clientHeight > 0)) end();
    };
    const observer = new ResizeObserver(check);
    observer.observe(element);
    return () => {
      observer.disconnect();
      surfaces.current.delete(element);
      queueMicrotask(check);
    };
  }, [end]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") end();
    };
    const onPageHide = () => {
      detachPlayer.current();
      sessionRef.current?.dispose();
      setStatus("ended");
      setNotice("Voice ended. You can keep typing or start again.");
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      detachPlayer.current();
      const session = sessionRef.current;
      sessionRef.current = null;
      session?.dispose();
      // Also reset if the tenant client or capability changes without a remount.
      if (session) setStatus("ended");
    };
  }, [bold, videoId, enabled, end]);

  const start = () => {
    if (!enabled || isPending || document.visibilityState === "hidden") return;
    if (sessionRef.current && ["connecting", "live", "ending"].includes(sessionRef.current.status)) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
      setNotice("Voice needs a browser with microphone access and a secure connection. You can still type.");
      return;
    }
    const player = playerRef.current;
    if (!player) {
      setNotice("Wait for the video to load, then try voice again.");
      return;
    }
    if (typeof player.paused !== "boolean") {
      setNotice("Voice is available with the built-in video player. You can still type your question.");
      return;
    }
    setNotice("");
    setMuted(false);
    setVideoPlaying(false);
    player.pause();
    const sessionKey = crypto.randomUUID();
    let failed = false;
    const session: PlaybackSession = bold.ai.voice.createSession({
      videoId,
      onStatus: next => {
        if (sessionRef.current === session) setStatus(next);
      },
      onCaptions: turns => {
        if (sessionRef.current === session) setMessages(previous => mergeVoiceCaptions(previous, turns, sessionKey));
      },
      onEnded: reason => {
        if (sessionRef.current !== session) return;
        detachPlayer.current();
        if (failed) return;
        const messages = {
          user: "Voice ended. You can keep typing or start again.",
          idle: "Voice ended after a quiet moment. Start again when you're ready.",
          time: "This voice session reached its time limit. You can keep typing.",
          server: "Voice ended. You can keep typing or start again.",
          connection: "Voice disconnected. Check your connection, then try again.",
          error: "Voice could not connect. You can still type your question.",
        };
        setNotice(messages[reason]);
      },
      onError: error => {
        if (sessionRef.current !== session) return;
        failed = true;
        void session.end();
        setNotice(voiceErrorMessage(error));
      },
    });
    sessionRef.current?.dispose();
    sessionRef.current = session;
    const syncPlayback = () => {
      const playing = !player.paused && !player.ended;
      const currentTime = Number.isFinite(player.currentTime) ? Math.max(0, player.currentTime) : 0;
      setVideoPlaying(playing);
      if (session.setPlaybackState) session.setPlaybackState({ playing, currentTime });
      else if (playing) end();
    };
    const events = ["play", "pause", "seeked", "ended"];
    for (const event of events) player.addEventListener(event, syncPlayback);
    detachPlayer.current = () => {
      for (const event of events) player.removeEventListener(event, syncPlayback);
    };
    syncPlayback();
    // start() must stay in the click gesture; onError presents failures once.
    void session.start().catch(() => {});
  };

  const toggleMuted = () => {
    const session = sessionRef.current;
    if (!session || session.status !== "live") return;
    session.setMuted(!session.muted);
    setMuted(session.muted);
  };

  const getLevels = useCallback(() => sessionRef.current?.getAudioLevels() ?? { input: 0, output: 0 }, []);

  return (
    <VoiceContext.Provider value={{ enabled, active, status, muted, videoPlaying, notice, start, end, toggleMuted, getLevels, observeSurface }}>
      {children}
    </VoiceContext.Provider>
  );
}
