---
date: 2026-09-29
status: living tracker
branch: gtmgym
live: https://gym.bold.video
---

# The GTM Gym: launch tracker

**The play:** FounderWell has the content, Bold has the tech. The GTM Gym is a joint lead
magnet. Founders get GTM questions answered with receipts from FounderWell sessions, get
a profile-aware coach (viewers, memory, voice) and shareable plans. FounderWell gets
qualified leads (email + business profile) and upsell to full sessions. Bold gets a public
showcase of every capability. Target: Product Hunt launch, "The GTM Gym, powered by
FounderWell knowledge".

**Non-negotiables:** genuinely useful; answers fact- and evidence-based but funny; every
shareable thing has an epic OG card; SEO-ready; teaser-only access to full sessions.

## Status legend
`[x]` done · `[~]` in progress · `[ ]` todo · `[?]` needs a decision

## A. Portal (fork `gtmgym`)

- [x] Synthwave skin, chat-first homepage, workouts, coach, OSD, ticker
- [x] Answer page: REP stamps, THE PLAY, receipts rail, instant replay (desktop + mobile sheet)
- [x] Ask thread survives /ask → /ask/<id>; deep-linked threads continue (no read-only)
- [x] OG: static home card, `/og?q=` REP card, `/og?v=&t=` session card, full OG+Twitter via `gymMeta()`
- [x] Perf: ISR homepage (69KB, ~170ms HIT), proxy settings cache, slim client settings, 3 preloaded fonts
- [x] **Answers as training plans:** the coach explains, shows the segment card inline, and prescribes reps ("3 sets × 20 emails"). Humor, but only what the tape says. Receipts inline (cards), rail stays
- [x] **Coaches roster on homepage** (portraits via Codex image gen from real photos/frames, sources in `coach-sources`; approval pending, see C): AI-polished synthwave portraits + gym bios
  - Cameron Brown: outbound (The GTM Company)
  - Drew Williams ("Coach Drew"): sales, demos, urgency, LinkedIn
  - Joel Smith ("Coach Joel"): product & growth UX
  - Vanessa Roberts: owns the building. Certified shrink, keeps the momentum going
  - Marcel Fahle: keeps the weight stack oiled; runs the tech
- [ ] Teaser mode (UI): receipts play only the cited segment, end card to FounderWell; drop full watch pages + ticker deep links; persona CTA points at FounderWell
- [ ] Onboarding, Ploy-style (see notes): one big question per screen → website with live favicon → "what do you want help with" → lands in chat with a "Your membership card" summary card and 3 recommended first reps
- [ ] One-click login (Google via Auth.js) → Bold viewer by email → `viewer` on every ask (memory)
- [ ] Gate: voice behind login; soft ask after ~3 reps ("want the coach to remember you?")
- [ ] Share snapshots: "Share this rep" creates a public snapshot; live threads become owner-private once profiles exist
- [ ] Shareable artifacts rendered in the gym skin (`/plan/<id>`), dynamic OG ("Acme's 4-week outbound program")
- [ ] Easter eggs: Konami → 1987 aerobics mode, 404 "You skipped this rep.", "Gym rat" badge at 10 reps, hydrate reminder, streak on share cards
- [ ] SEO: sitemap, robots, JSON-LD (Organization, FAQPage for shared reps, VideoObject for clips), per-page canonical (done), indexable public reps/plans
- [ ] Product Hunt kit: gallery images, demo GIF, tagline, maker comment

## B. Bold platform tickets

- [ ] **Segment-only answers (teaser mode), BOLD-1994:** public chat answers from the full library but exposes only cited segments. Mux instant clipping + signed tokens with clip claims (see notes)
- [ ] **Interview engine, BOLD-1995:** viewer interview (profile → traits) + tenant interview (onboarding). Template of fields; pre-fill from traits + memory; websites as sources; asks only gaps; frontend-triggerable ("catch-up" summarizes recent convos and asks follow-ups); text + `gpt-live-1` voice (needs non-video voice session kind)
- [ ] **Public artifact mode + new kinds:** portal-rendered, long-lived shares, receipts kept as clip refs; kinds: training plan, script, scorecard, cheat sheet (BOLD-1980 v1 is private-only, 7-day shares, generic OG, strips citations)
- [ ] **SDK:** `viewer` / `viewerProfile` on `ai.chat` (API already accepts them; only voice exposes them)
- [ ] **Persona:** gym-coach voice in account persona settings, so text, voice and artifacts all sound the same (rep-obsessed, gym wisdom → GTM principles)
- [ ] **Conversation share snapshots** (public, immutable) vs private live threads

## C. Business / launch

- [?] Clean public tenant (the current `gtm-gym` tenant has fictional viewers/questions/analytics + disclaimer). Reuse the BOLD-1991 copy script. Keep `gtm-gym` for sales demos
- [?] FounderWell agreement: public use of the content, lead sharing, CTA destination (founderwell.com/invite-next?), consent copy
- [?] Coaches approve their likeness, bios and humor (Cameron, Drew, Joel)
- [ ] Lead routing to FounderWell (export / webhook / Clay)
- [x] `:viewers` flag on account 110 (already on)
- [ ] `:viewer_memory` flag on account 110 (Mission Control → Accounts → Memory; Marcel)
- [?] OpenAI key for portal-side voice prototype (on hold)

## Notes

### Ploy onboarding (screenshots in `BOLD/_RESEARCH/Ploy/`)
- One question per screen, huge type, lots of air: "What's your website?"
- Input shows the site's favicon live as you type (domain → favicon lookup); clear (×) button
- Escape hatch under the CTA: "I don't have a website yet"
- Next screens: single-choice cards ("What's your vision for your site?"), then multi-select
  ("What do you want help with? Choose as many as you like")
- Lands in a chat. First message is a summary card of what they learned (Website, About,
  Focus, Design), then a personal welcome ("Welcome, Marcel…"), live agent status lines
  ("Sifting (21s)", "Building your design system 10s"), then a "What should we tackle
  first?" picker: 3 numbered options, one tagged Recommended, plus free text
- Gym translation: "What's your website?" → membership card → "What are we training?"
  (outbound / positioning / demos / pricing …) → first workout recommended

### Coaches in the library (from video metadata)
Cameron Brown (9 sessions), Joel Smith / "Coach Joel" (8), Drew Williams / "Coach Drew" (12),
Tom Morkes (6), Alex Turnbull (4), Julian Gordon (2), guests: Nick Abraham, Pedro Cortés,
Sam Dunning. founderwell.com team page lists Vanessa Roberts, Joel Smith, Shahab Kaviani,
Dr. Ghaz Samandari, Dr. Jai Belton, Emily Iafrate. Zero to $10M (Alex Turnbull, Tom Morkes)
is a separate brand; confirm how FounderWell relates before naming it on the page.

### Mux segment-only playback (verified in docs)
- Instant clipping on existing VOD assets: `stream.mux.com/{id}.m3u8?asset_start_time=&asset_end_time=`.
  No re-encode, no extra cost, Mux Player ≥ 2.3 via `extra-source-params`; cuts at segment
  boundaries (a few seconds of slack)
- Enforcement: with **signed** playback the clip bounds go into the JWT claims (playback
  `aud: v`, storyboard `aud: s`) and can't be stripped. Needs a signed-only playback ID
  (a public ID on the same asset still plays everything); keep MP4 downloads off
- Thumbnails take `time` only; the server picks a frame inside the clip
- Alternative: real clip assets (`mux://assets/{id}` with start/end), frame-accurate with
  their own playback ID, but billed as new assets and not instant

### Persona v2 draft (paste into Mission Control → AI settings for account 110)
Current persona (scripts/gtm_gym_demo_persona.exs) asks for ≤120 words and ≤3 bullets, but
answers run ~300 words with 4+ bullets. The plan layout is "take → drills → today's set",
so this version asks for exactly that shape.

> **persona_voice:** You are the coach at The GTM Gym. You're obsessed with reps. Every
> answer is a mini training plan: (1) one or two sentences with the take, grounded in the
> tape; (2) two or three drills as bullets, each one concrete, doable this week, and citing
> the moment that teaches it; (3) a final line starting "Your set:" with a countable action
> (sets × reps, e.g. "Send 3 sets of 20 emails, change only the offer, log replies").
> Stay under 150 words. Funny in the gym way, never at the founder's expense. Only claim
> what the training says, and say so when the tape doesn't cover it.
> Gym wisdom you can use, always tied to the GTM point: light weight, more reps (small
> experiments beat big launches); form before weight (positioning before spend); warm-up
> sets (20 prospects before 2,000); progressive overload (raise volume weekly); don't skip
> leg day (positioning); no ego lifting (don't copy enterprise playbooks at seed stage);
> rest days (let data land before changing the campaign); log your PRs (track what works).
> Never impersonate or name real podcast hosts.
