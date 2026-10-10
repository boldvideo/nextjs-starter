import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChapterList } from "@/components/chapter-list";
import { askSourceToCitation } from "@/hooks/use-ai-ask-stream";
import { sourceToCitation } from "@/hooks/use-ai-search-stream";
import { processCitations } from "@/lib/citation-helpers";

test("signed chapters retain titles and timestamps without requesting Mux thumbnails", () => {
  const props = { chaptersWebVTT: "WEBVTT\n\n00:00:15.000 --> 00:00:30.000\nPlanning your day",
    playbackId: "chapter-demo", onChapterClick: () => {} };
  for (const credentials of [{ playbackPolicy: "signed" as const }, { playbackToken: "fixture" }]) {
    const html = renderToStaticMarkup(createElement(ChapterList, { ...props, ...credentials }));
    assert.ok(html.includes("Planning your day"));
    assert.ok(html.includes("0:15"));
    assert.ok(!html.includes("image.mux.com"));
    assert.ok(!html.includes("<img"));
  }
  const publicHtml = renderToStaticMarkup(createElement(ChapterList, props));
  assert.ok(publicHtml.includes("image.mux.com"));
  assert.ok(publicHtml.includes("<img"));
});

test("ask and search citations retain signed metadata through citation normalization", () => {
  const source = { video_id: "signed", playback_id: "signed-mux", title: "Signed lesson", timestamp: 83,
    timestamp_end: 95, text: "Plan your day", playbackPolicy: "signed" as const,
    playbackToken: "fixture-playback", storyboardToken: "fixture-storyboard", thumbnail: "/poster.png" };
  for (const convert of [askSourceToCitation, sourceToCitation]) {
    const [citation] = processCitations([convert(source, 0)]);
    assert.equal(citation.playbackPolicy, "signed");
    assert.equal(citation.playbackToken === source.playbackToken, true);
    assert.equal(citation.storyboardToken === source.storyboardToken, true);
    assert.equal(citation.thumbnail, source.thumbnail);
    assert.equal(citation.startMs, 83000);
    assert.equal(citation.endMs, 95000);
  }
});
