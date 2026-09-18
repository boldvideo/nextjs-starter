import type { Page } from "@playwright/test";

/** Deterministic browser media/transport; the application still uses the real Bold SDK. */
export async function mockVoice(page: Page, options: { permission?: "denied" | "pending"; brokerStatus?: number } = {}) {
  await page.route("**/ai/voice/sessions", route => route.fulfill({
    status: options.brokerStatus ?? 200,
    contentType: "application/json",
    body: JSON.stringify(options.brokerStatus ? { error: "unavailable" } : { session_id: "voice-test", sdp: "answer", max_seconds: 180, idle_seconds: 60 }),
  }));
  await page.route("**/api/ask", route => route.fulfill({ status: 200, contentType: "text/event-stream",
    body: 'data: {"type":"text_delta","delta":"Here is your answer."}\n\ndata: [DONE]\n\n' }));
  await page.addInitScript(({ permission }) => {
    const state = { requests: 0, stops: 0, sent: [] as Record<string, unknown>[], track: { enabled: true, stop() { state.stops++; } }, emit: (_event: unknown) => {}, grant: () => {}, audioMuted: false };
    Object.assign(window, { __voice: state });
    const media = { getTracks: () => [state.track], getAudioTracks: () => [state.track] };
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", { value: async () => {
      state.requests++;
      if (permission === "denied") throw new DOMException("Denied", "NotAllowedError");
      if (permission === "pending") await new Promise<void>(resolve => { state.grant = resolve; });
      return media;
    } });
    class AudioContextMock {
      resume() { return Promise.resolve(); }
      close() { return Promise.resolve(); }
      createMediaStreamSource() { return { connect() {} }; }
      createAnalyser() { return { fftSize: 512, getByteTimeDomainData(array: Uint8Array) { array.fill(128); } }; }
    }
    class AudioMock {
      autoplay = false;
      srcObject = null;
      set muted(value: boolean) { state.audioMuted = value; }
      play() { return Promise.resolve(); }
      pause() {}
    }
    class PeerMock extends EventTarget {
      iceGatheringState = "complete";
      localDescription = { sdp: "offer" };
      ontrack: ((event: unknown) => void) | null = null;
      channel = {
        readyState: "open", onmessage: null as ((event: { data: string }) => void) | null, onclose: null, onerror: null,
        send: (data: string) => {
          const event = JSON.parse(data);
          state.sent.push(event);
          if (event.type === "session.close") state.emit({ type: "session.closed" });
        },
        close() {},
      };
      addTrack() {}
      createDataChannel() {
        state.emit = event => this.channel.onmessage?.({ data: JSON.stringify(event) });
        return this.channel;
      }
      createOffer() { return Promise.resolve({ type: "offer", sdp: "offer" }); }
      setLocalDescription() { return Promise.resolve(); }
      setRemoteDescription() {
        this.ontrack?.({ streams: [media] });
        state.emit({ type: "session.started" });
        return Promise.resolve();
      }
      close() {}
    }
    Object.assign(window, { AudioContext: AudioContextMock, Audio: AudioMock, RTCPeerConnection: PeerMock });
  }, options);
}

export async function preparePlayer(page: Page) {
  await page.locator("mux-player").waitFor();
  await page.evaluate(() => {
    const player = document.querySelector("mux-player")!;
    let paused = true;
    let currentTime = 0;
    Object.defineProperties(player, {
      paused: { get: () => paused }, ended: { get: () => false },
      currentTime: { get: () => currentTime, set: value => { currentTime = value; } },
      play: { value: () => { paused = false; player.dispatchEvent(new Event("play")); return Promise.resolve(); } },
      pause: { value: () => { paused = true; player.dispatchEvent(new Event("pause")); } },
    });
  });
}

export async function caption(page: Page, speaker: "input" | "output", delta: string) {
  await page.evaluate(({ speaker, delta }) => {
    const voice = (window as unknown as { __voice: { emit: (event: unknown) => void } }).__voice;
    voice.emit({ type: `session.${speaker}_transcript.delta`, delta });
  }, { speaker, delta });
}
