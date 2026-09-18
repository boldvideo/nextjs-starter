import { test } from "node:test";
import assert from "node:assert/strict";
import { VoiceAPIError, type Settings, type VoiceCaptionTurn } from "@boldvideo/bold-js";
import { getPortalConfig } from "@/lib/portal-config";
import { isVideoVoiceEnabled, mergeVoiceCaptions, videoQuery, voiceErrorMessage } from "@/lib/video-voice";

test("voice defaults off and preview never enables a disabled AI account", () => {
  assert.equal(getPortalConfig(null).ai.voiceEnabled, false);
  const settings = { account: { ai: { enabled: true } } } as Settings;
  assert.equal(getPortalConfig(settings).ai.voiceEnabled, false);
  const enabled = { ...settings, account: { ...settings.account, voice: { enabled: true } } };
  assert.equal(getPortalConfig(enabled).ai.voiceEnabled, true);
  assert.equal(isVideoVoiceEnabled(true, false), false);
  assert.equal(isVideoVoiceEnabled(true, false, "1"), true);
  assert.equal(isVideoVoiceEnabled(false, true, "1"), false);
  assert.equal(isVideoVoiceEnabled(true, true, "0"), false);
  assert.equal(isVideoVoiceEnabled(true, false, "true"), false);
  assert.equal(isVideoVoiceEnabled(true, false, ["1", "0"]), false);
});

test("canonical redirects preserve only supported preview values and encode time", () => {
  assert.equal(videoQuery({ t: "83", voice: "1" }), "?t=83&voice=1");
  assert.equal(videoQuery({ voice: "0" }), "?voice=0");
  assert.equal(videoQuery({ voice: "yes" }), "");
  assert.equal(videoQuery({ t: "1&voice=1", voice: ["1", "0"] }), "?t=1%26voice%3D1");
});

test("caption deltas update their existing turn without mutating typed messages or older sessions", () => {
  const turn: VoiceCaptionTurn = { id: "turn-1", speaker: "assistant", text: "Try 0:00", startedAt: 1, updatedAt: 1,
    segments: [{ type: "text", text: "Try " }, { type: "timestamp", text: "0:00", seconds: 0 }] };
  const typed = [{ role: "user" as const, content: "My typed question" }];
  const first = mergeVoiceCaptions(typed, [turn], "session-1");
  const updated = mergeVoiceCaptions(first, [{ ...turn, text: "Try 0:00 again" }], "session-1");
  assert.equal(updated.length, 2);
  assert.equal(first[1].content, "Try 0:00");
  assert.equal(updated[0], typed[0]);
  assert.equal(updated[1].voiceSegments?.[1].type, "timestamp");
  const reconnected = mergeVoiceCaptions(updated, [turn], "session-2");
  assert.equal(reconnected.length, 3);
  assert.notEqual(reconnected[1].id, reconnected[2].id);
});

test("broker and permission failures have actionable copy without leaking provider messages", () => {
  for (const status of [401, 402, 403, 404, 409, 422, 429, 500]) {
    const error = new VoiceAPIError(new Response(null, { status }), { message: "private provider details" });
    assert.doesNotMatch(voiceErrorMessage(error), /private provider/);
  }
  assert.match(voiceErrorMessage(new DOMException("denied", "NotAllowedError")), /Allow it in your browser/);
  assert.match(voiceErrorMessage(new VoiceAPIError(new Response(null, { status: 402 }))), /allowance/);
  assert.match(voiceErrorMessage(new VoiceAPIError(new Response(null, { status: 409 }))), /Another voice session/);
});
