---
title: "One prompt, many callers: the answer-shape contract between the Bold prompt and the GTM Game portal"
date: 2026-10-02
category: design-patterns
module: GTM Game answer prompt (Bold account 110 answer_synthesis) and portal answer parser
problem_type: design_pattern
component: service_layer
severity: high
applies_when:
  - Changing the answer shape in the account 110 answer_synthesis prompt template
  - Changing how the portal parses answers into moves, next steps, or detours
  - Adding a new caller that sends its own output format through the same prompt (like ARCADE MODE or ROAST MODE)
  - Adding a rule that must hold for every question, including ones the intent classifier tags factual
  - Tuning follow-up behavior so later answers keep earlier promises
symptoms:
  - Off-topic questions got stretched moves and a fake next quest instead of an honest redirect
  - A follow-up swapped an earlier promise for a booking-link ask
  - The detour marker comment was dropped after the rule block moved
  - A rule inside the non-factual block never applied to questions tagged factual
related_components:
  - frontend
  - tooling
tags: [prompt-template, answer-shape, parser-contract, explicit-format, detour, intent-classification, follow-up-consistency, gtm-game]
---

# One prompt, many callers: the answer-shape contract between the Bold prompt and the GTM Game portal

## Context

The GTM Game portal (branch `gtmgym`, live at play.founderwell.com) renders every AI answer by parsing its markdown into a fixed layout: the take, numbered MOVE cards, "Say it like this" blocks, and a "Your next quest" card. The printable Playbook reuses the same parser. The answer text comes from Bold's `answer_synthesis` prompt template, overridden for account 110 in bold_admin's `prompt_templates` table. The prompt and the parser therefore form one contract that lives in two repos and is easy to break from either side.

This session rewrote the prompt several times (prompt v2 through v2.4, which are prod template versions 1–5 for account 110). What went wrong along the way:

- **An `:::artifact` container plus a "Make it for me" list was designed and sampled, then dropped.** The user decided Bold will build artifacts platform-side. Shipping that prompt before a matching parser would also have broken the live UI: the existing parser treats the last paragraph after the bullets as the quest, so the "Make it for me" bullets would have rendered as moves, with the last one as "Your next quest".
- **Marker-only detection failed.** The off-topic answer was tagged with a leading `<!-- detour -->` comment. Once that rule moved to a different spot in the template, the model followed the shape but dropped the marker in all three test answers of that sample run (per this session).
- **Intent gating hid a rule.** The off-topic rule first lived inside `{% if intent != "factual" %}`. A live "give me a paella recipe" still got the old answer (an honest refusal ending in a cooking-lesson suggestion, and no redirect) because the rule never fired for that question; this session assumed it was classified factual.
- **A soft consistency rule did not hold.** "Never swaps it for a bigger ask without saying so" still produced: level 1 "Reply 'yes' and I'll send it over" → level 2 "book 15 minutes to get it". The sources (booking-call advice) outweighed the rule until it was made blunt.
- **Two detour shapes (off-the-map vs thin), each with its own marker,** were collapsed into one after the user said if/else-heavy prompts confuse the model.

## Guidance

**1. Treat the answer shape as an API.** The parser contract, in `lib/gym-plan-parse.ts`:
- `splitPlan` (`lib/gym-plan-parse.ts:67`) splits an answer into intro / bullets / closing step.
- `parseMove` (`:108`) reads `**Name.**` via `NAME_RE` (`:106`) and the indented `> ` lines as the words to say.
- `stripStepLabel` (`:130`) removes "Next step:" because the card supplies its own label.
- `stepTarget` (`:135`) pulls the count for the Playbook score line.
- `parseDetour` (`:177`) recognizes questions the library can't answer.

Callers include, e.g., `components/gym/gym-plan.tsx:72` (detour), `:290`/`:293` (step), and `app/(print)/plan/[conversationId]/page.tsx:8`, `:117`, `:161`. Change prompt and parser together. When the shape changes, **ship the parser first** and keep fallbacks so stored old answers still render: a move without a name falls back to its first sentence in the Playbook, and an answer without a marker still parses.

**2. One prompt, many callers: an explicit format wins.** The same account-110 template also answers the Objection Dodger (`lib/gym-dodger.ts:71`, "ARCADE MODE. Reply in the exact format below…") and Roast my pitch (`lib/gym-roast.ts:38`, "ROAST MODE. Reply in exactly this format…"). The template's rule 0 keeps them working (`thoughts/shared/plans/2026-10-02-gtm-game-prompt-v2/v2_system.liquid:130`): "An explicit format wins. If the player's message prescribes its own output format … follow that format exactly and ignore the rest of this section." Caveat, as of this writing: rule 0 sits inside the `{% if intent != "factual" %}` block (`v2_system.liquid:125`), so strictly it only covers non-factual requests; on factual-classified requests nothing competes with the caller's format except DON'T STRETCH, which carries its own exception (`:99`). Moving rule 0 above the intent gate would make the guarantee unconditional. Re-run an ARCADE and a ROAST request after every prompt change. Callers with their own format should stream and collect the answer on the server: the non-streamed Bold chat call times out around 30 s, which the stricter Dodger scout prompt crossed (session history).

**3. Detect by shape; treat markers as hints.** `DETOUR_RE` (`lib/gym-plan-parse.ts:175`) accepts `detour`, `off-the-map` or `thin` markers. When no marker is present, `parseDetour` still classifies an answer as a detour (`:200-205`) when all of these hold:
- no "Next step:" line;
- 2–4 bullets;
- no bullet starts with `**` (real moves always have bold names);
- all but at most one bullet end with "?";
- at most 130 words.

The kind comes from the line itself: a citation means "thin", no citation means "off-the-map" (`:192`, `:207`). The marker only helps the renderer switch during streaming. In this session's parser check across 29 sampled answers, marked or not, every one was classified correctly.

**4. Put always-on rules outside intent gates.** Bold classifies questions (insight / discovery / factual), and the template wraps the answer shape in `{% if intent != "factual" %}` (`v2_system.liquid:125`). Rules that must apply to every question belong outside that block. The DON'T STRETCH rule now sits before the factual block (`v2_system.liquid:97-107`) and says it "wins over every other answer format below, except a format the player prescribes".

**5. Follow-ups keep their promises, and the rule has to be blunt.** The rule that held (`v2_system.liquid:132`): "the next answer delivers exactly that, first. Never make a call or meeting the price of something already promised; offer it only after the promise is delivered."

**6. Prefer one shape over branches.** The detour is now a single shape: one honest line, at most one cited "closest lesson", and three GTM questions. The portal decides how to render it.

**7. Operations.**
- Edit through `PromptTemplates.create_new_version` (bold_admin) so the previous version stays inactive for rollback and the account's AI caches clear.
- As of this writing, per this session's prod queries, account 110 went from v1 (template row id `6552ae1f…`) to v5 (template row id `080bdb3a…`).
- The working copy of the template text is `thoughts/shared/plans/2026-10-02-gtm-game-prompt-v2/v2_system.liquid` (local only; `thoughts/` is gitignored, so the prod row is the source of truth). Persona fields (name, voice, framing, greeting, starters) live in `account_ai_settings`, not the template, and were historically pasted by hand in Mission Control; nothing about the prompt deploys from this repo (session history).

## Why This Matters

The prompt runs in production for every caller of account 110 the moment a new version is created, while the parser only changes on a portal deploy. A shape change in either repo without the other shows up directly in the UI: fake quests, bullets rendered as moves, raw markers, a broken mini-game. Over-specified prompts fail in quieter ways: the model follows the shape but drops the bookkeeping, or the sources overrule a polite rule.

## When to Apply

- Any change to the account-110 `answer_synthesis` template or persona fields.
- Any change to `lib/gym-plan-parse.ts` or the components that consume it.
- Adding a new feature that calls the same template with its own format (follow the ARCADE/ROAST pattern: a leading "X MODE. Reply in exactly this format" line).
- Porting the GTM Game pattern to another tenant.

## Examples

Before (marker-dependent, gated, soft):
```
{% if intent != "factual" %}
… OFF THE MAP: reply with <!-- off-the-map --> … THIN: reply with <!-- thin -->…
… the follow-up delivers that promise; it never swaps it for a bigger ask without saying so.
{% endif %}
```
Results: paella got no redirect; markers were dropped; the follow-up asked for a call.

After (one always-on shape, blunt promise rule, shape-based parser):
```
DON'T STRETCH:            ← outside every intent gate
<!-- detour -->           ← optional hint
One or two honest sentences (+ one cited closest lesson)
- three GTM questions ending in "?"
```
```ts
parseDetour(text)  // marker or shape → Wrong Cabinet screen; never a fake quest
```
Verification loop used for each version: sample in memory on the prod node (off-topic cases, a two-level follow-up thread, ARCADE passthrough), ship with `create_new_version`, re-ask live via the Bold API, and check the rendering locally.

## Related

- `docs/solutions/architecture-patterns/coach-clips-mux-instant-clipping-server-chosen-windows.md`: the clips each citation in these answers plays.
- `thoughts/shared/plans/2026-10-02-gtm-game-prompt-v2/README.md` (local only; `thoughts/` is gitignored): the v1 ship notes and rollback, and the in-memory test harness. Versions after v1 are recorded only in this doc and the prod `prompt_templates` rows.
- `thoughts/shared/handoffs/2026-10-02-gtm-game-actionable.md`: the original prompt v2 proposal; its artifact container and "Make it for me" chips were dropped (Bold builds artifacts platform-side).
