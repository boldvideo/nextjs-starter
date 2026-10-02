---
date: 2026-10-02
branch: gtmgym (portal) + bold_admin (prompts, memory)
live: https://play.founderwell.com
status: handoff — start here in a fresh session
previous: thoughts/shared/handoffs/2026-09-30-gtm-game-rebrand.md (system map, domains, CRMs, gotchas)
---

# Handoff: make The GTM Game actionable

## TL;DR

User testing says the answers are great but **stop at advice**. Turn every answer into something the
founder can use: **teach to fish and make the fish**. Three linked changes, designed together:

1. **Prompt v2** (bold_admin, account 110): intent-aware answers. "How do I / what do I say" → a ready
   artifact (script, email, positioning line, talk track) with a coaching note per part ("why this works",
   cited to the coach + minute). "Should I / why isn't it working" → short take, 2–3 moves, one real next step.
2. **Answer UI** (portal): replace "Your next quest / I did it" with **"Make it for me"** chips that
   generate the next artifact as a follow-up; artifacts render as a copyable document card.
3. **Strategy guide → Playbook** (portal print page): the artifact as a clean, usable doc (coaching notes,
   clips as links/QR, sources, copy/print). No tally boxes, no save points, no checklist cosplay.

Plus one platform bug: **memory drift** (point 4 below).

## The feedback (user test, 2026-10-01)

Vidyard: https://share.vidyard.com/watch/3je9PsohPDML4BnJMRuiiS. The transcript is public: fetch
`https://play.vidyard.com/player/3je9PsohPDML4BnJMRuiiS.json` → `payload.chapters[0].captions[0].vttUrl`.

What landed: "doesn't feel like a generic LLM", "powered by coaches", website analysis on sign-in, and
clips that jump to the exact moment ("slick… you don't have to watch a 10-minute video").

What didn't:
- **Next step unclear.** "How do I run a good demo?" got a quest + "I did it". "Am I actually gonna
  complete this or not?" Quests only make sense for doable actions.
- **Strategy guide:** "seems interesting, but I just don't know how to use it." Reads as a summary with
  checkboxes.
- **Wants artifacts:** "When I'm using AI, I want it to create something for me." The **demo script**
  was the high point ("copy and paste into my CRM"). Wants **coaching points inside it**: "why is
  confirming the pain important? what are we referencing?" → "teaching them how to fish."
- **Memory drift:** asked about targeting bookkeepers a few chats ago; later answers kept bringing up
  bookkeepers ("as soon as it drifts off… we just skip out").
- **Copilot or lead magnet?** "It's kind of doing both." Answer: a free GTM copilot built on
  FounderWell's coaching. Artifacts make it a copilot; clips + "the full session lives in the program"
  make it FounderWell's funnel.

## 1. Prompt v2 (bold_admin)

Where the prompts live:
- Base chat templates: `bold_admin/priv/prompts/chat/transcript_only.md.eex`, `web_mix.md.eex`
- Per-account overrides: Mission Control → prompt template editor
  (`lib/bold_admin_web/live/missioncontrol/prompt_template_editor_live.html.heex`), stored in the DB.
  **Edit account 110 through Mission Control, not raw SQL on prod.**
- Persona fields (`persona_voice` etc.): Mission Control → account AI settings. Current draft is
  "Persona v3" in `thoughts/shared/plans/2026-09-29-gtm-gym-launch.md` (not pasted yet). The seed script
  is `bold_admin/scripts/gtm_gym_demo_persona.exs`.
- Viewer context in the prompt: `prompt_variables.ex` (`viewer.profile`, `has_viewer_profile?`); the
  portal also sends `viewerProfile: {stage}` (lib/gym-player.ts / app/api/ai-ask/route.ts).

Design (agree on it before writing):
- Classify intent first: **make** (script / email / message / positioning / talk track / checklist) vs
  **decide/diagnose** (should I, why, which).
- **Make:** a one-line take, then the artifact in a fenced block the portal can detect (e.g.
  ```` ```artifact type="demo-script" title="…" ```` ), each section followed by
  `> Why: … [c_xxx]` coaching notes, then 2–3 "make it for me" follow-up suggestions.
- **Decide:** take → 2–3 moves (cited) → "Next step:" only if it's a doable action; otherwise
  suggestions.
- Under 150 words outside the artifact. Cite every claim. Game voice stays light (Game Master), never
  tough-guy.
- Ask Marcel to paste the current system/user prompts if they're not readable from the repo/admin.

## 2. Answer UI (portal, this repo)

The parser and renderer are tied to the current shape ("take → bullets → closing line"):
- `lib/gym-plan-parse.ts` (`splitPlan`: intro/drills/notes/set). Shared with print.
- `components/gym/gym-plan.tsx` (`GymPlan`, `GymClip`, `GymSet` = the "Your next quest" card with
  I did it / Share / Strategy guide).
- `components/ask/ask-page-content.tsx` (thread, follow-up bar, coin gate, stage prompt).

Change:
- Detect the artifact block → render a **document card** (title, sections, coaching notes with inline
  clip chips, Copy as text/Markdown, Open as Playbook).
- Replace `GymSet` with an action row: **"Make it for me" chips** (from the model's suggestions, or a
  fixed set per intent) that send the follow-up; Share; Playbook. Keep XP/achievements as light
  flavor (e.g. "Artifact unlocked").
- Old conversations must still render (fallback to the current layout when there's no artifact).

## 3. Playbook (replaces the strategy guide)

`app/(print)/plan/[conversationId]/page.tsx` + `app/(print)/print.css`. Today it has a level map,
moves with tally boxes, save points, a HIGH SCORE stamp and cheat codes: cut the checklist parts. New:
title = the artifact; the artifact text with coaching notes; each note's clip as a short link + QR
(QRs must stay short-URL + margin + ≥84px to scan); the coach credit; "Make your own at
play.founderwell.com". Keep the arcade accent subtle. Copy-to-clipboard on screen, clean on print.
Consider renaming the route later (`/plan/<id>` is in shared QR codes; keep it working).

## 4. Memory drift (bold_admin)

Viewer memory: `lib/bold_admin_web/live/missioncontrol/account_viewer_memory_live.ex`,
`controllers/api/viewer_memory_controller.ex`, `lib/bold_admin/ai.ex`. Check whether `:viewer_memory`
is now on for account 110 (it was off on 2026-09-29). Likely fix: memory extraction should keep only
durable facts the player states about **themselves** (company, ICP, stage), not topics from a question;
answers should weigh the current question over memory. Portal side later: show "what the Game Master
remembers" on `/player` with delete.

## Constraints (from earlier sessions)

- Branch `gtmgym`; push = production deploy (play.founderwell.com). Stage only your own files: **another
  agent is working on the Konami mini-game** (`components/gym/gym-dodger.tsx`, `gym-arcade.tsx`,
  `lib/gym-arcade.ts`, `lib/gym-track.ts` had uncommitted changes on 2026-10-01). Don't touch or commit them.
- No Co-Authored-By / "Generated with" lines in commits.
- Checks: `npx tsc --noEmit -p .`, `npx eslint <paths>`, `bun run build` (homepage must stay `○ / 1m`).
  Local: `cp .env.local.gtmgym .env.local && bun dev --port 3014`.
- Test threads: `/ask/30cd05c7-0935-4715-90a5-e865775eb374` (feature-dumping demos),
  `/ask/0ba99598-02d9-453d-beb0-2bd2ed19600c` (outbound list). Strategy guide: `/plan/30cd05c7-…`.
- HubSpot deal descriptions + Plausible events (`lib/gym-track.ts`) exist; add events for "Artifact
  made" / "Playbook" when the UI lands.

## Suggested order

1. Read the current prompts (repo templates + account 110 overrides); write prompt v2 + the artifact
   block contract together with the parser change. Test against 5–10 real questions (both intents).
2. Portal: artifact card + "Make it for me" chips, fallback for old threads.
3. Playbook page.
4. Memory drift investigation in bold_admin (separate PR there).
