import { test } from "node:test";
import assert from "node:assert/strict";
import { AnswerInteraction, SourceOpen, sourceUrl, type EngagementEvent } from "@/lib/source-engagement";

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

test("independent opens count playing wall time, never pauses or seek positions", async () => {
  let now = 0;
  const events: EngagementEvent[] = [];
  const send = async (event: EngagementEvent) => { events.push(event); return true; };
  const answer = new AnswerInteraction("answer-one");
  const first = new SourceOpen("video-one", answer, send, () => now);
  const second = new SourceOpen("video-two", answer, send, () => now);
  await tick();
  assert.deepEqual(events.map(e => e.n), ["source_open", "source_open"]);
  first.play();
  now = 1250;
  second.play();
  now = 3500;
  first.pause(); // also used on waiting/seeking
  now = 9000;
  second.pause();
  now = 10000;
  first.play();
  now = 11250;
  first.pause();
  await tick();
  await first.flush();
  assert.equal(first.watchedSeconds, 4.75);
  assert.equal(second.watchedSeconds, 7.75);
  assert.notEqual(first.openId, second.openId);
  assert.equal(events.filter(e => e.n === "video_progress").at(-1)?.watched_seconds, 4.75);
  assert.ok(events.every(e => e.interaction_id === "answer-one"));
});

test("pending completion retains early opens and elapsed time without adopting another answer", async () => {
  let now = 0;
  const events: EngagementEvent[] = [];
  const answer = new AnswerInteraction();
  const other = new AnswerInteraction();
  const open = new SourceOpen("video", answer, async event => { events.push(event); return true; }, () => now);
  open.play();
  now = 2300;
  open.pause();
  other.complete("newer-answer");
  assert.equal(events.length, 0);
  answer.complete("original-answer");
  await tick();
  assert.deepEqual(events, [
    { n: "source_open", interaction_id: "original-answer", playback_id: open.openId, vid: "video" },
    { n: "video_progress", interaction_id: "original-answer", playback_id: open.openId, vid: "video", watched_seconds: 2.3 },
  ]);
  answer.complete("wrong-replacement");
  assert.equal(answer.id, "original-answer");
});

test("missing IDs emit nothing and pending opens expire after thirty seconds", async () => {
  let now = 0;
  const events: EngagementEvent[] = [];
  for (const id of [null, undefined]) {
    const answer = new AnswerInteraction(id);
    const open = new SourceOpen("video", answer, async event => { events.push(event); return true; }, () => now);
    open.play();
    now += 31000;
    open.pause();
    answer.complete("too-late");
    await open.flush();
  }
  assert.equal(events.length, 0);
});

test("failed open retries retain one UUID and never send progress before an accepted open", async () => {
  let now = 0;
  const events: EngagementEvent[] = [];
  let accepted = false;
  const open = new SourceOpen("video", new AnswerInteraction("answer"), async event => {
    events.push(event); return accepted;
  }, () => now);
  await tick();
  open.play();
  now = 1750;
  open.pause();
  await tick();
  assert.ok(events.every(e => e.n === "source_open"));
  accepted = true;
  await open.flush();
  assert.equal(events.at(-1)?.n, "video_progress");
  assert.equal(events.at(-1)?.watched_seconds, 1.75);
  assert.equal(new Set(events.map(e => e.playback_id)).size, 1);
});

test("final progress retries after a long watch and retains the cumulative counter", async () => {
  let now = 0;
  const events: EngagementEvent[] = [];
  const open = new SourceOpen("video", new AnswerInteraction("answer"), async event => {
    events.push(event);
    return event.n === "source_open" || events.filter(e => e.n === "video_progress").length > 1;
  }, () => now);
  await tick();
  open.play();
  now = 41_250;
  open.pause();
  await new Promise(resolve => setTimeout(resolve, 1100));
  const progress = events.filter(e => e.n === "video_progress");
  assert.equal(progress.length, 2);
  assert.deepEqual(progress.map(e => e.watched_seconds), [41.25, 41.25]);
  assert.equal(new Set(events.map(e => e.playback_id)).size, 1);
});

test("a pause during in-flight progress preserves the newer counter for retry", async () => {
  let now = 0;
  let finish: (accepted: boolean) => void = () => {};
  const events: EngagementEvent[] = [];
  const open = new SourceOpen("video", new AnswerInteraction("answer"), async event => {
    events.push(event);
    if (event.n === "video_progress" && events.length === 2) {
      return new Promise<boolean>(resolve => { finish = resolve; });
    }
    return true;
  }, () => now);
  await tick();
  open.play();
  now = 40_000;
  const flushing = open.flush();
  now = 75_500;
  open.pause();
  finish(true);
  await flushing;
  await new Promise(resolve => setTimeout(resolve, 1100));
  assert.deepEqual(events.filter(e => e.n === "video_progress").map(e => e.watched_seconds), [40, 75.5]);
});

for (const uploadDelay of [0, 5100]) {
  test(`successful progress with ${uploadDelay}ms latency waits for the normal cadence`, { timeout: 10_000 }, async () => {
    let now = 0;
    let finish: (accepted: boolean) => void = () => {};
    const events: EngagementEvent[] = [];
    const open = new SourceOpen("video", new AnswerInteraction("answer"), async event => {
      events.push(event);
      if (event.n === "video_progress" && events.length === 2) {
        return new Promise<boolean>(resolve => { finish = resolve; });
      }
      return true;
    }, () => now);
    await tick();
    open.play();
    now = 5000;
    const flushing = open.flush();
    // Exercise both no interval overlap and a timer tick during a slow upload.
    await new Promise(resolve => setTimeout(resolve, uploadDelay));
    now += uploadDelay + 250;
    finish(true);
    await flushing;
    await new Promise(resolve => setTimeout(resolve, 1100));
    assert.deepEqual(events.filter(e => e.n === "video_progress").map(e => e.watched_seconds), [5]);
    open.pause();
    await tick();
    assert.deepEqual(events.filter(e => e.n === "video_progress").map(e => e.watched_seconds), [5, uploadDelay === 0 ? 5.25 : 10.35]);
  });
}

test("navigation preserves timestamp and encodes the exact originating search", () => {
  const url = sourceUrl("/v/demo?t=83", undefined, { query: "a & b", requestId: "action" });
  assert.equal(url, "/v/demo?t=83&search_query=a+%26+b&search_request_id=action");
  assert.equal(sourceUrl("/v/demo?t=83", null), "/v/demo?t=83");
});
