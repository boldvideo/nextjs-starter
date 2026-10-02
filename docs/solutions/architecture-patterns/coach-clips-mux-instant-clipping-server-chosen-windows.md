---
title: "Coach clips, not whole sessions: Mux instant clips with server-chosen windows"
date: 2026-10-02
category: architecture-patterns
module: GTM Game coach clips (Mux instant clipping)
problem_type: architecture_pattern
component: frontend
severity: high
applies_when:
  - Playing a cited moment from a long session instead of the whole video
  - Choosing where a clip starts and ends for an AI answer citation
  - Deciding whether a Mux playback ID can be exposed to the browser
  - Reporting player progress to analytics while playing a clip
related_components:
  - api_layer
  - infrastructure
  - observability
tags: [mux, instant-clipping, signed-playback, clip-window, transcript, video-security, analytics, gtm-game]
---

# Coach clips, not whole sessions: Mux instant clips with server-chosen windows

## Context

The GTM Game portal (branch `gtmgym`, live at play.founderwell.com) used to play every citation by loading the full Mux session and seeking to the cited second. FounderWell does not want whole sessions exposed: the game is a funnel, and the full sessions live in their paid program. The goal was "play only the coach's moment" without re-encoding anything.

Mux offers two ways to clip. Asset-based clipping creates a new asset (re-encode, slow, stored). Instant clipping trims the existing asset at playback time via URL parameters `asset_start_time` / `asset_end_time` (seconds from the start of the asset), with no extra encoding cost (Mux docs, https://www.mux.com/docs/guides/create-instant-clips). Instant clipping fits a chat answer that cites arbitrary moments on demand.

Things that were considered and rejected this session:

- **A fixed window ("give every clip 6 minutes").** Three or four six-minute clips per answer approach the whole session, which defeats the purpose. The user-test feedback also praised clips for not making them watch long videos.
- **Letting the LLM output start/end times.** The model only sees ~10s transcript chunks per citation, so it would invent end times. Times must come from data, not generation.
- **Relying on CSP or Mux playback restrictions (Referer allowlist) to protect the full session.** CSP is a policy of our own page and does not stop anyone loading `stream.mux.com/<playbackId>.m3u8` elsewhere. Referer-based restrictions are an optional layer: native apps send no Referer, `allow_no_referrer: true` lets unrestricted playback through, and the header can be set by any non-browser client (e.g. `ffmpeg -headers "Referer: …"`) (Mux docs, https://www.mux.com/docs/guides/secure-video-playback).
- **Client-side "teaser mode" (seek to the cited second, or pause at an end time) as protection.** Every AI answer already hands the browser the session's public playback ID on each citation, and `stream.mux.com/<id>.m3u8` plays the whole recording; hiding the rest in the UI prevents nothing (session history). Removing full-video links from the UI (e.g. the homepage marquee now starts a level instead of opening a session) is UX, not enforcement (session history).
- **Public playback ID + clip params as "security."** On a public playback ID the clip params are just query strings; removing them returns the full session. Mux itself "strongly recommend[s] using this feature alongside signed URLs."

## Guidance

1. **Pick the window on the server, from the transcript, around the cited moment.** `clipWindow` in `lib/gym-clip-window.ts:74` takes sentence boundaries built from word-level transcript timing (`sentencesFrom`, `lib/gym-clip-window.ts:58`) plus speaker turns (utterances):
   - Start: the start of the cited sentence, backed up by at most two earlier sentences of the same turn within `MAX_LEAD = 12` s (`lib/gym-clip-window.ts:49`, `:90-94`); if the speaker's turn began within `TURN_SNAP = 15` s before the citation, start there (`:51,99`); minus 0.5 s (`:100`).
   - End: the speaker's turn end when it lands at a natural length (≥ cited end + 10 s and ≥ start + 30 s, ≤ start + `SOFT_MAX = 90`, `:106`), otherwise the first sentence end past `max(citedEnd + MIN_AFTER(15), start + MIN_LENGTH(45))` (`:53-54,104`), capped at start + `HARD_MAX = 120` (`:56,112`), plus 0.3 s when the session duration is known (`:113`).
   - No transcript: fall back to cited start − 3 s for 60 s (`:81-84`).
   Callers only say *which moment was cited*; they never choose the length. The route is `GET /api/gym/clip?v=<videoId>&s=<citedStartMs>&e=<citedEndMs>` (`app/api/gym/clip/route.ts:11-18`), edge-cached for a day (`:23`). Transcripts are cached in-process for an hour (`lib/gym-clip.ts:31`).

2. **The client plays what the server returns instead of building Mux URLs.** The server returns an opaque `params` object (`lib/gym-clip.ts:85`); the player passes it straight through as Mux Player's `extraSourceParams` (`components/players/player-mux.tsx:349`). Today `params` is `{asset_start_time, asset_end_time}`. The window always comes from the shared resolver: answer clip cards, the replay rail and mobile panel, Roast my pitch, the `/clip/<id>?t=` page (`app/(default)/clip/[id]/page.tsx:31`), Playbook QR labels, and the Dodger tape via `toClip` (`lib/gym-dodger.ts:47`). Two places still build Mux parameters on the client and must change with the signed-playback swap too: the Dodger plays `{start, end}` and builds `extraSourceParams` itself (`components/gym/gym-dodger.tsx:926`, with its own fallback window in `lib/gym-dodger.ts:49`), and clip cards build `image.mux.com` thumbnail URLs (`components/gym/gym-plan.tsx:499`). When no clip resolves, `GymClipPlayer` falls back to the full session at the cited second (`components/gym/gym-clip-player.tsx:70`).

3. **The real lock is signed playback with the window inside the JWT.** With signed playback IDs, "it's required to include the clipping parameters as claims inside the respective JWTs" for playback and storyboard tokens, and the signed URL carries only the token (Mux docs, both pages above). A leaked playback ID is then worthless: the token plays only that window and expires. Mux allows adding a signed playback ID to an existing asset and deleting the public one, with no re-encode. **Pending:** this platform work (bold_admin signing keys, per-citation tokens, tenant switch to signed-only; ticket BOLD-1994) is not built. As of this writing every Bold asset is created with `"playback_policies" => ["public"]` (per this session's grep of bold_admin), so the portal's clips are a UX change, not a security boundary.

4. **Expect segment granularity.** Instant clips cut at segment boundaries (Mux docs: content "may start a few seconds earlier, and end a few seconds later"). This session observed 5 s segments: a 60 s window played as a 65 s clip. Don't promise frame-accurate edges. The 0.3 s end padding is cosmetic.

5. **The player's clock is clip-relative.** A clipped manifest starts at 0, so `currentTime` inside a clip is an offset, not the session minute. Analytics must add `clip.start` back (`components/players/player-mux.tsx:299`, `:306`), and the "seek to startTime" effect is skipped when a clip is present (`:274`). Thumbnails/posters are still asset-time, so `thumbnailTime` uses `clip.start + 2` (`:358`).

## Why This Matters

- Policy should follow the caller, not the video: the same session should play in full in FounderWell's members area and only as clips in the game or an MCP/ChatGPT surface. "Clips only" should therefore be a property of the API key or surface asking, enforced by Bold (BOLD-1994, not built as of this writing), not a flag on the video and not something each portal re-implements (session history). Today the portal alone decides to play clips.

- Exposure: without signed playback, anything in the browser (playback ID + params) gives a determined viewer the whole session. Knowing that keeps "clips" from being sold internally as protection.
- Abuse surface once tokens exist: `/api/gym/clip` currently accepts any timestamp, so someone could walk a session one window at a time. When signing ships, issue tokens only for moments that were actually cited (e.g. tied to a conversation/citation id), not arbitrary `s` values.
- Correctness: LLM-picked or fixed windows produce clips that cut mid-thought or leak too much; transcript snapping produced 33 s–1:11 clips that start and end on whole sentences in this session's tests.

## When to Apply

- Any surface that plays a cited moment of a Bold/Mux session (answers, sources rails, shares, print QR codes, mini-games, MCP/ChatGPT widgets).
- Any tenant that wants "receipts without giving away the course."
- When implementing BOLD-1994: keep the server-chooses-window contract and swap `params` for tokens.

## Examples

Before (full session, seek to cited second):

```tsx
<MuxPlayerComponent video={{ id, playbackId, title }} startTime={Math.floor(citation.startMs / 1000)} />
```

After (server-chosen window, opaque params, clip-relative clock):

```tsx
// lib/use-gym-clip.ts fetches /api/gym/clip?v=…&s=…&e=… once per moment
// GymClipPlayer wraps this: undefined while loading, null → full session at the cited second
const clip = useGymClip({ videoId, startMs: citation.startMs, endMs: citation.endMs });
<MuxPlayerComponent video={{ id: videoId, playbackId: clip?.playbackId ?? playbackId, title }} clip={clip} />
// player-mux: extraSourceParams={clip?.params}; analytics report currentTime + clip.start
```

Future (signed, pending BOLD-1994): `params` becomes `{ playback_token, thumbnail_token, storyboard_token }` signed with `{ sub: playbackId, aud: "v", exp, asset_start_time, asset_end_time }`, passed as Mux Player `tokens`; the public playback ID is deleted.

## Related

- `thoughts/shared/plans/2026-09-29-gtm-gym-launch.md`: earlier research on Mux segment-only playback and the BOLD-1994 teaser-mode item; predates the server-chosen window, the Referer analysis, and the analytics offset.
- `thoughts/shared/plans/2026-05-19-remove-citation-snippet-clip.md`: removed client-side end-time pausing from citation players on `main`; that approach is not a clip mechanism, and Mux-native clipping is the gtmgym follow-up.
- `thoughts/shared/handoffs/2026-09-30-gtm-game-rebrand.md`: teaser-mode requirement (play only the cited segment, end on a "full session at FounderWell" card).
- `docs/interaction-rollout.md`: source-open/progress analytics that the clip-relative clock must not distort.
