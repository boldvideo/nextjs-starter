/** An answer owns its interaction, including opens made before completion arrives. */
export class AnswerInteraction {
  readonly requestId = crypto.randomUUID();
  private listeners = new Set<(id: string | null) => void>();
  constructor(public id?: string | null) {}
  complete(id?: string | null) {
    if (this.id !== undefined) return;
    this.id = id ?? null;
    if (typeof window !== "undefined") {
      // Short-lived handoff for a source opened in another tab before completion.
      try {
        const key = `bold:interaction:${this.requestId}`;
        localStorage.setItem(key, JSON.stringify({ id: this.id, at: Date.now() }));
        setTimeout(() => localStorage.removeItem(key), 30_000);
      } catch { /* Storage may be disabled; same-page pending opens still work. */ }
      window.dispatchEvent(new Event("bold:interaction"));
    }
    this.listeners.forEach(listener => listener(this.id!));
    this.listeners.clear();
  }
  subscribe(listener: (id: string | null) => void) {
    if (this.id !== undefined) listener(this.id);
    else this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
}

export interface EngagementEvent {
  n: "source_open" | "video_progress";
  interaction_id: string;
  playback_id: string;
  vid: string;
  watched_seconds?: number;
}

/** One explicit open, independent of other players, answers, playheads, and media IDs. */
export class SourceOpen {
  readonly openId = crypto.randomUUID();
  private started?: number;
  private elapsed = 0;
  private interval?: ReturnType<typeof setInterval>;
  private opened = false;
  private sending = false;
  private sentSeconds = 0;
  private retry?: ReturnType<typeof setTimeout>;
  private readonly deadline: number;
  private unsubscribe = () => {};

  constructor(
    readonly videoId: string,
    readonly interaction: AnswerInteraction,
    private readonly send: (event: EngagementEvent) => Promise<boolean> = async (event) => {
      try {
        const response = await fetch("/event", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event), keepalive: true,
        });
        return response.ok;
      } catch { return false; }
    },
    private readonly now = () => performance.now(),
  ) {
    this.deadline = now() + 30_000;
    this.unsubscribe = interaction.subscribe(() => { void this.flush(); });
    // A missing completion must not retain an explicit open forever.
    const expiry = setTimeout(() => this.unsubscribe(), 30_000);
    const unsubscribe = this.unsubscribe;
    this.unsubscribe = () => { clearTimeout(expiry); unsubscribe(); };
  }

  play() {
    if (this.started !== undefined) return;
    this.started = this.now();
    this.interval = setInterval(() => { void this.flush(); }, 5_000);
  }

  pause() {
    if (this.started !== undefined) this.elapsed += this.now() - this.started;
    this.started = undefined;
    clearInterval(this.interval);
    void this.flush();
  }

  get watchedSeconds() {
    return (this.elapsed + (this.started === undefined ? 0 : this.now() - this.started)) / 1000;
  }

  async flush() {
    const id = this.interaction.id;
    if (!id || this.sending || (!this.opened && this.now() > this.deadline)) return;
    this.sending = true;
    const base = { interaction_id: id, playback_id: this.openId, vid: this.videoId };
    try {
      if (!this.opened) this.opened = await this.send({ n: "source_open", ...base });
      if (!this.opened) return;
      const seconds = this.watchedSeconds;
      if (seconds > this.sentSeconds && await this.send({ n: "video_progress", ...base, watched_seconds: seconds })) {
        this.sentSeconds = seconds;
      }
    } finally {
      this.sending = false;
      if ((!this.opened || this.watchedSeconds > this.sentSeconds) && this.now() < this.deadline) {
        clearTimeout(this.retry);
        this.retry = setTimeout(() => { void this.flush(); }, 1_000);
      }
    }
  }
}

/** An explicit navigation carries context; the destination owns its new open UUID. */
export function sourceUrl(path: string, interactionId?: string | null, search?: { query: string; requestId: string }, pendingAnswer?: string) {
  const url = new URL(path, "https://portal.invalid");
  if (interactionId) url.searchParams.set("interaction_id", interactionId);
  else if (pendingAnswer) url.searchParams.set("answer_request_id", pendingAnswer);
  if (search) {
    url.searchParams.set("search_query", search.query);
    url.searchParams.set("search_request_id", search.requestId);
  }
  return `${url.pathname}${url.search}`;
}
