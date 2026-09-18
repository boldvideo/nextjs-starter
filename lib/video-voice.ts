import { VoiceAPIError, type VoiceCaptionTurn } from "@boldvideo/bold-js";
import type { Message } from "@/components/video/chat/types";

/** Preview affects visibility only. The broker still enforces account and video access. */
export const isVideoVoiceEnabled = (aiEnabled: boolean, voiceEnabled: boolean, preview?: string | string[]): boolean => {
  return aiEnabled && (preview === "1" || (preview !== "0" && voiceEnabled));
};

export const videoQuery = (params: { t?: string; voice?: string | string[] }): string => {
  const query = new URLSearchParams();
  if (params.t) query.set("t", params.t);
  if (params.voice === "1" || params.voice === "0") query.set("voice", params.voice);
  return query.size ? `?${query}` : "";
};

/** Session-qualified IDs keep repeated SDK turn IDs separate after reconnecting. */
export const mergeVoiceCaptions = (messages: Message[], turns: readonly VoiceCaptionTurn[], sessionKey: string): Message[] => {
  const next = [...messages];
  for (const turn of turns) {
    const id = `${sessionKey}:${turn.id}`;
    const message: Message = { id, role: turn.speaker, content: turn.text, voiceSegments: turn.segments };
    const index = next.findIndex(item => item.id === id);
    if (index < 0) next.push(message);
    else next[index] = message;
  }
  return next;
};

export const voiceErrorMessage = (error: Error): string => {
  if (error.name === "NotAllowedError" || error.name === "SecurityError") {
    return "Microphone access was blocked. Allow it in your browser, then try again. You can still type.";
  }
  if (error.name === "NotFoundError") return "No microphone was found. Connect one, then try again.";
  if (error.name === "NotReadableError") return "Your microphone is busy. Close other apps using it, then try again.";
  if (error instanceof VoiceAPIError) {
    if (error.status === 402) return "This account has used its voice allowance. You can still type your question.";
    if (error.status === 409) return "Another voice session is active. End it before starting a new one.";
    if (error.status === 429) return "Voice is busy right now. Wait a moment, then try again.";
    if (error.status === 401 || error.status === 403) return "Voice is not available for this account or video. You can still type.";
    if (error.status === 404 || error.status === 422) return "Voice is not available for this video yet. You can still type.";
  }
  return "Voice could not connect. Check your connection and try again, or type your question.";
};
