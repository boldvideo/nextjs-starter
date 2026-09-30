---
date: 2026-09-30
branch: gtmgym
live: https://gym.bold.video
status: handoff — start here in a fresh session
next: rebrand "The GTM Gym" → "The GTM Game" (80s arcade), then the backlog below
related: thoughts/shared/plans/2026-09-29-gtm-gym-launch.md (living tracker), BOLD-1994, BOLD-1995
---

# Handoff: The GTM Gym → The GTM Game

## TL;DR

The GTM Gym is a custom Bold portal: a chat-first, synthwave 1987 skin over licensed FounderWell GTM sessions. It's live at **gym.bold.video** and fully working: answers laid out as training plans with inline clips, coach identification, printable plans with QR codes, server-enforced thread ownership, Google sign-in with Bold-viewer profiles, epic OG cards, and a founder note.

**Vanessa's feedback (Marcel agrees):** the gym-bro language is the only part that's off-brand for FounderWell. Keep the colors, vibe and avatars, but **shift the theme from gym bros to 80s arcade video games**: "The GTM Game", levels instead of sets, fun without the toxic bravado, speaks to GenX. Her words:

> What is the possibility of shifting the theme/branding to 80's style video game (PacMan, Donkey Kong, Mario Bros,) vs. gym bros. This is the only part of this that feels off and contra to our brand. I love the colors, vibe, etc... Coaches are avatars still. Slight language tweaks seems to be the only thing to do this... The GTM Game vs The GTM Gym. Sets turn into Levels...or quests or whatever. Speaks to the GenXers in our crowd. And is still fun without the toxic leaning bravado??

**Marcel's constraint:** make it feel like those games "in a way that Nintendo is not going to sue us, but barely." See the IP guardrails below.

**The job for the next session:** reskin, not rebuild. The architecture stays. The work is vocabulary, copy, persona and assets.

---

## 1. Live system and how to work on it

| What | Where |
|---|---|
| Live site | https://gym.bold.video (after rebrand: add game.bold.video, keep gym.bold.video redirecting) |
| Branch | `gtmgym` on `boldvideo/nextjs-starter` (forked off `main` 2026-09-28) |
| Vercel project | `gtm-gym` (prj_OFcXQwaVcG25FY3ZX9iaxyiriP84), team boldvideo (team_u1ixFau19ri9W0XXjqMUsI6O), production branch `gtmgym`, ignore-build-step skips other branches. Push to `gtmgym` = production deploy |
| Hosted default portal | https://gtm-gym.bold.video stays the stock hosted portal (don't touch) |
| Bold tenant | account 110, slug `gtm-gym`, schema `bt_gtm-gym`: 69 licensed FounderWell videos, 6 playlists. Demo data in the tenant (12 viewers, questions, analytics) is fictional (BOLD-1991) |
| Local dev | `cp .env.local.gtmgym .env.local && bun dev --port 3014`. Restart the dev server after env changes or adding/removing route folders |
| Vercel env | BOLD_API_KEY, BACKEND_URL, NEXT_PUBLIC_BASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL (prod only), GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET |
| Vercel API token | `~/Library/Application Support/com.vercel.cli/auth.json`; run `vercel whoami` first to refresh it (it expires and fails silently) |
| Google OAuth | existing client `312063284494-khpcj0at61e6tcs9u39uc2pdbhrtis7s.apps.googleusercontent.com` (secret in `.env.all`). App is in **Testing**: only Marcel + Vanessa can sign in until it's published. Redirect URIs registered: `https://gym.bold.video/api/auth/callback/google`, `http://localhost:3014/api/auth/callback/google`. **Add the game.bold.video callback** when the domain moves |
| Checks | `npx tsc --noEmit -p .`, `npx eslint <paths>`, `bun run build` (homepage must stay `○ /  1m` ISR) |
| Commits | stage specific files only; no Co-Authored-By / "Generated with" lines |

Test conversations: `/ask/0ba99598-02d9-453d-beb0-2bd2ed19600c` (outbound list, 2 reps), `/ask/30cd05c7-0935-4715-90a5-e865775eb374` (feature-dumping demos). Printable: `/plan/30cd05c7-0935-4715-90a5-e865775eb374`.

---

## 2. What's built (code map)

All skin code is in `components/gym/*`, plus a few fork overrides.

**Homepage** (`app/(default)/page.tsx` → `components/gym/gym-homepage.tsx`)
- `gym-backdrop.tsx`: sky + stars; `GymHorizon` anchors the striped sun and the rolling neon floor to the headline.
- `gym-ask-hero.tsx`: coach bubble (personalized when signed in), chrome headline "WHAT'S THE MOVE?", "by FounderWell" sticker, neon input "Coach me", dice = random question, 4 starter "workouts" (`gym-workouts.ts`), "WTF?" note sticker.
- `gym-osd.tsx`: VCR on-screen display (PLAY ▶, SP · 69 TAPES, a running counter, CH 03).
- `gym-coaches.tsx` + `gym-coaches-data.ts`: staff roster (Cameron, Drew, Joel, Vanessa, Marcel), with session counts matched from video descriptions.
- Ticker of real session titles and a footer (disclaimer, "A note from FounderWell", Powered by Bold).

**Answer page** (`components/ask/ask-page-content.tsx`, fork-modified)
- The thread lives in `app/(default)/ask/layout.tsx` via `ask-shell.tsx`, so it survives the /ask → /ask/<id> URL flip. Pages return null.
- The head reads "Your set / Marcel's set · N reps · coached for Acme" (`SetHead`).
- Each rep: stamp "REP 01" + question → `components/gym/gym-plan.tsx`:
  - Coach's take (lead coach named once, with avatars)
  - beats with a clip after each cited paragraph
  - drills as an open numbered timeline
  - "This week's workout" card with I did it / Share / Print the plan
- `lib/gym-plan-parse.ts` splits answers into intro/drills/notes/set and resolves `[c_xxx]` refs. It's shared with print.
- Clips play inline (Mux) with their own `SourceOpen` engagement; only one video plays at a time.
- The proof rail (`ask-sources-rail.tsx`) is opt-in via a toggle; chips open it as the "Instant replay" panel. The mobile replay sheet is `ask-video-panel.tsx`.
- `gym-loading.tsx` (REC + bro-isms) and `gym-follow-up.tsx` (the follow-up bar).
- Shared-link visitors see "Someone else's set. Your turn." Their question starts a fresh thread (`streamQuestion(q, [], { fresh: true })`).

**Coach identification:** `app/api/gym/coach-map/route.ts` (hourly ISR) maps videoId/playbackId → coach slug. It's used by `use-coach-map.ts`.

**Printable plan:** `app/(print)/plan/[conversationId]/page.tsx` (own root layout + `print.css`). It's a paper trainer's sheet with QR codes (short video id, error-correction M, margin 2; verified to decode), sets × reps blanks, a weekly tick row, a "COACH APPROVED" stamp, house rules and a signature.

**Ownership:** `lib/gym-ownership.ts`. An httpOnly `gym_uid` cookie + an HMAC owner token (issued on the stream only to the asker) is required for follow-ups on `/api/ai-ask`, `/api/ask` and `/api/coach`. Shared links are read-only on the server.

**Auth + profiles**
- `lib/auth.ts` / `lib/auth-client.ts`: Better Auth 1.7, **stateless** (JWE cookie, `refreshCache`, no DB), Google only. next-auth was removed.
- `lib/gym-viewer.ts`: signed-in member = Bold viewer (looked up by email, created on first use).
- `/member` (`gym-member-page.tsx`): membership card + profile form → viewer traits `business_name`, `website`, `business_description`.
- Asks pass `viewer` (answer page + video chat). `use-gym-member.ts` reads the session client-side only, so pages stay ISR.
- **bold-js patch:** `patches/@boldvideo%2Fbold-js@1.29.0.patch` adds `viewer`/`viewerProfile` to `ai.chat` (the API accepts them; the SDK dropped them). Vercel applies it via `patchedDependencies`.

**Share cards / SEO**
- `lib/gym-meta.ts` `gymMeta()` emits the full OG + Twitter set on every page (Next shallow-merges `openGraph`).
- The homepage card is a static `public/gym/og-home.jpg?v=2`, rendered from `design/gtm-gym/og/card.html`.
- `app/(default)/og/route.tsx`: `/og?q=` (REP card with the question) and `/og?v=&t=` (session "screen" card), satori → JPEG via sharp (<100KB).

**Founder note:** `gym-founder-note.tsx`, opened by the "WTF?" starburst, the footer link, or `#note`. A calm letter in FounderWell's look (paper, navy #123644, teal #00A4BD, Vanessa's photo, Caveat signature). The copy is a **draft in Vanessa's voice; she must approve it.**

**Theme**
- `app/(default)/globals.css` `--gym-*` tokens: night #0b0618, pink #ff2ea6, cyan #22e6ff, orange #ff8a1f, yellow #ffd23f.
- Utilities: `.gym-chrome`, `.gym-sun`, `.gym-floor`, `.gym-neon-frame`, `.gym-button`, `.gym-scanlines`, `.font-display` (Bungee), `.font-osd` (VT323).
- `lib/gym-fonts.ts` loads only Space Grotesk, Bungee, VT323 (+ Caveat, no preload).

**Perf wins to keep**
- Layout metadata must not call `headers()` (it kills ISR).
- The proxy caches standalone settings for 60s.
- `featuredPlaylists` is stripped from the client settings.
- The floor animates via transform.
- The homepage is ~69KB, ~170ms on a CDN HIT.

---

## 3. The rebrand brief: The GTM Game

### Direction
- **Keep:** the synthwave palette, sunset + neon grid (it's literally OutRun, a 1986 arcade game), Bungee chrome lettering, scanlines, the avatars, the layout, every feature.
- **Swap the costume:** from gym/VHS-workout-tape to **80s arcade cabinet**.
  - The page is the cabinet screen: CRT curvature/vignette optional.
  - The HUD replaces the VCR OSD: `1UP`, `HI-SCORE`, `CREDITS 01`, `INSERT COIN` blink, `PRESS START`.
  - Pixel accents: 8-bit borders, pixel arrows, chunky pixel icons.
  - Optional chiptune blips, muted by default with a speaker toggle.
- **Voice:** a friendly game master or arcade attendant, not a drill sergeant. Warm, nostalgic, a little cheesy on purpose. Zero bravado: nothing about grinding, suffering, "no pain no gain", or "bro".

### Vocabulary map (apply everywhere: UI copy, OG cards, print, meta, persona)

| Gym (now) | Game (new) | Notes |
|---|---|---|
| The GTM Gym | **The GTM Game** | Vanessa's pick. Alternative considered: "GTM Arcade" |
| by FounderWell | by FounderWell | keep the sticker |
| What's the move? | **What's your next move?** or **PRESS START** | "move" already works in games |
| Talk to me, bro… | "Player one, ready? What do you want to know about going to market?" | persona |
| Coach me (submit) | **Press start** (first question) / **Play** (follow-ups) | |
| Set / New set | Game / **New game** | "Someone else's game. Your turn: press start." |
| Rep 01 | **Level 01** | stamp stays |
| Coach's take | Coach's take, or "Game plan" | coaches still named per answer |
| Drills | **Moves** (or quests) | "Move 01" |
| This week's workout | **Your next quest** | "I did it" → "Quest complete! +100 XP" |
| Share this rep | **Share your run** | "Link copied. Challenge a friend." |
| Print the plan | **Print the strategy guide** | print sheet → strategy guide / cheat sheet |
| The proof / Watch the clip | The proof · **Instant replay** | keep, it's already game-y |
| REC · Pulling the tape… | **LOADING LEVEL…** · "Blowing on the cartridge…" · "Finding the secret level…" | loading lines |
| OPEN 24/7 | **INSERT COIN** (blinking) / CREDITS: FREE PLAY | bar HUD |
| Membership card / Get your card | **Player card** / "Press start to join" | `/member` → consider `/player` with a redirect |
| Meet your coaches | **Select your coach**, a character-select screen | stat bars per coach (Outbound ████░, Demos ██░…) |
| Leg day / Cardio / Heavy lift / Sparring | **World 1-1 Positioning / 1-2 Outbound / 1-3 Demos / 1-4 Objections** | "World x-y" is a generic pattern; don't copy any specific game's level art |
| Today's program | **Choose your level** | |
| Dice (random rep) | **Random level** | |
| Log the rep / Done. Now hydrate. | Quest complete! / "Continue? Y/N" | |
| Error "Dropped the bar." | **"GAME OVER. Insert coin to try again."** | retry |
| House rules (print) | **Cheat codes** (the gym-wisdom lines, rewritten) | e.g. "↑↑↓↓ small experiments beat big launches" |
| Coach approved stamp | **HIGH SCORE** stamp | |
| Gym rat badge (planned) | **Achievement unlocked** | |

### Persona v2 (paste into Mission Control → AI settings, account 110)
Rewrite the draft in the tracker for the game theme:
- The coach is a friendly arcade game master.
- Every answer is a mini game plan:
  1. one or two sentences of take, grounded in the tape
  2. 2–3 moves as bullets, each citing the moment that teaches it
  3. a closing line "Your next quest:" with a countable action
- Under 150 words.
- Humor is nostalgic and kind. Only claim what the training says.
- Game metaphors map to GTM principles:
  - save points = document what worked
  - small levels before boss fights = test on 20 prospects before 2,000
  - power-ups = offers and assets
  - the boss = the objection
  - extra lives = runway, so don't waste them
- Never impersonate real people. No bro language.
- Also update the tenant's `ai_name` (e.g. "Game Master" or keep "Coach"), greeting and conversation starters. The tenant `description` still carries the fictional-demo disclosure.

### Assets to regenerate
- **Logo** (currently a dumbbell + bar chart, `public/gym/logo.webp`; source `design/gtm-gym/tenant-logo.png`) → arcade cabinet or joystick + bar chart, same palette. Also upload it to the tenant (logo/favicon) and replace `logo-og.png`.
- **AI coach avatar** (`public/gym/coach.webp`, sunglasses tracksuit guy) → the same character as an arcade attendant or game master (headset, token belt, joystick), or a pixel-art version.
- **Five portraits** (`public/gym/coaches/*.webp`):
  - same people, character-select style
  - swap the props: Cameron with a joystick/coin stack, Drew with a controller, Joel with a level-editor clipboard, Vanessa holding the arcade's keys (she still "owns the building"), Marcel with a wrench inside an open cabinet
  - optionally 16-bit pixel-art variants for the select screen
- **Share cards:** update `design/gtm-gym/og/card.html` (the static home card; bump `?v=` in `GYM_HOME_IMAGE`) and `app/(default)/og/route.tsx` text ("REP 01" → "LEVEL 01", "COACH'S TAKE + THE PROOF" etc.); the backdrop `public/gym/og-bg.jpg` can stay.
- **Print sheet** → "STRATEGY GUIDE" / "CHEAT SHEET": level map, moves table, quest checkboxes, cheat codes, "HIGH SCORE" stamp.
- **Founder note:** keep the letter; the sticker becomes "PSST" or "READ ME". Reframe the copy: less "this isn't hustle culture", more "this is a Bold technology demo on real FounderWell sessions; we made it a game because learning should be fun; here's what FounderWell stands for". Vanessa approves.

**Portrait pipeline (works, proven):**
- Codex CLI with its image tool, run in a scratch dir with the photo and `design/gtm-gym/coach-sources/style-reference.png`:
  ```
  echo "Use your image generation tool. Create a portrait illustration of the person in <photo>, drawn in the exact same illustration style as style-reference.png: bold 80s synthwave cartoon, thick dark outlines, circular badge frame with a hot-pink/cyan neon ring, striped sunset background inside the circle, transparent outside the circle. Square 1024x1024 PNG. Keep the real person's likeness. Scene: <costume + prop>. Save it as <name>.png in the current directory. Do not modify any other files." \
    | codex exec --skip-git-repo-check -s workspace-write -i <photo> -i style-reference.png
  ```
- Run all five in parallel (`&` + `wait`).
- Encode with `cwebp -q 84 -resize 480 480`.
- Source photos are in `design/gtm-gym/coach-sources/`:
  - `cam-face.jpg` and `drew-crop-big.jpg` are webcam-tile crops from Mux thumbnails
  - `joel-site.jpg` is from founderwell.com
  - `marcel.jpg` and `vanessa.jpg` are from boldvideo.com
- Don't sips-resize PNG cutouts (Chrome rendering bug); use cwebp.

**Rendering the static share card:** `python3 -m http.server 8741` from the repo root, open `http://localhost:8741/design/gtm-gym/og/card.html` in Playwright at 1200×630, `document.fonts.ready`, screenshot → `sips -s format jpeg -s formatOptions 88` → `public/gym/og-home.jpg`. Use a Playwright screenshot with `animations: 'allow'` or you'll capture animations at frame 0.

### Rename plumbing
- **Domain:** add `game.bold.video` to the Vercel project (POST /v10/projects/:id/domains); 308-redirect gym.bold.video → game.bold.video. Update `NEXT_PUBLIC_BASE_URL` / `BETTER_AUTH_URL` / `GYM_BASE_URL` fallback and the Google redirect URI.
- Old shared `/ask/<id>` and `/plan/<id>` links must keep working through the redirect.
- **Code names:** leave `gym-*` file/CSS names as-is at first (churn for no user value); rename only user-visible strings. Optional cleanup later.
- **Meta:** title "The GTM Game — by FounderWell", descriptions, image alts, the Product Hunt tagline.

---

## 4. IP guardrails: "Nintendo shouldn't sue us, but barely"

Not legal advice; the practical line for a parody-flavored demo. The rule: **evoke the era, never borrow the characters, names, logos or specific designs.**

**Free to use (generic arcade culture)**
- pixel art, 8-bit/16-bit look, CRT scanlines, arcade cabinets, joysticks, coin slots, tokens
- "INSERT COIN", "PRESS START", "PLAYER 1/2", "1UP", "HI-SCORE", "GAME OVER", "CONTINUE? 9…8…", "LEVEL 1-1", "WORLD 1", "BOSS FIGHT", "EXTRA LIFE", "ACHIEVEMENT UNLOCKED", "FREE PLAY"
- the Konami code (↑↑↓↓←→←→BA) as an easter egg: it's a button sequence, universally riffed on
- high-score tables with three-letter initials
- original chiptune blips (write our own, don't sample)
- generic power-up ideas (a star, a heart, a lightning bolt) in our own art style
- original characters (our coaches as avatars)

**"Barely" (wink, don't copy)** — allowed as parody-flavored text nods, never with names, sprites or logos
- "Thank you, founder! But your pipeline is in another castle." (riff on a famous line; no character names)
- A maze-chase or barrel-dodge *mini-game idea* rendered in our own shapes and colors, e.g. dodging "send me some info" objections. Only if it's clearly our own art.
- "It's dangerous to go alone. Take this: [a playbook]"
- A pixel "coin" chime for a completed quest (original sound)

**Don't**
- character names or likenesses: Mario, Luigi, Peach, Bowser, Donkey Kong, Pac-Man, the ghosts, Link, Sonic, Mega Man…
- their trade dress: `?` blocks, green warp pipes, mushrooms/fire flowers in their style, the Pac-Man maze with pellets and a yellow wedge, DK's girders and barrels, the Game Boy/NES hardware silhouette
- logos, fonts or wordmarks (Nintendo, Namco, SEGA, "Super", "Nintendo Power")
- sampled sounds or music
- naming the product or anything in it after a real game

Vanessa's message names PacMan/Donkey Kong/Mario as the *feeling*. The design should make GenX feel that without shipping any of them.

---

## 5. Open decisions and pending approvals

- [ ] **Name:** "The GTM Game" (Vanessa's pick, recommended) vs "GTM Arcade"
- [ ] **Domain:** game.bold.video (recommended) + redirect from gym.bold.video
- [ ] **Vanessa** approves the founder note copy (and the reframe for the game theme)
- [ ] **Coaches** (Cameron, Drew, Joel) approve their likeness, bios and humor before anything public
- [ ] **FounderWell ↔ content:** founderwell.com is Vanessa's founder-wellness company. The sessions are run by Cameron Brown (The GTM Company), Drew Williams (Sales Playbook Builder) and Joel Smith (on FounderWell's team). Alex Turnbull/Tom Morkes (Zero to $10M) appear in some. Confirm how to credit this ("powered by FounderWell knowledge") and where the CTA goes (founderwell.com/invite-next?)
- [ ] **Clean public tenant** vs the demo tenant (fictional viewers/questions/analytics) before a public launch / Product Hunt
- [ ] **Publish the Google OAuth app** (currently Testing: Marcel + Vanessa only)
- [ ] **Memory flag** for account 110: Mission Control → Accounts → Memory (Viewers is already on)
- [ ] Lead routing to FounderWell (export/webhook/Clay) and consent copy on sign-in

---

## 6. Backlog (after the rebrand), in rough priority

1. **Rebrand** (this doc, section 3), then verify desktop + mobile + OG + print, and deploy.
2. **Test the signed-in loop end to end** (Marcel is doing this): sign in → player card → profile → ask → tailored answer. If answers aren't tailored, check how Bold's prompt consumes viewer traits (`prompt_variables.ex`: `viewer.profile`, `has_viewer_profile?`).
3. **Persona v2** pasted in admin (section 3). Answers currently run ~300 words vs the 120–150 target.
4. **Teaser mode UI:** receipts play only the cited segment and end on a "full session at FounderWell" card; drop full watch pages and ticker deep links (QR codes and `/v/<id>` links too). Platform side is **BOLD-1994** (Mux instant clipping + signed clip claims).
5. **Onboarding interview** (Ploy-style, `BOLD/_RESEARCH/Ploy/`): after sign-in, "What's your website?" with a live favicon → choice cards → the chat lands with a player-card summary + "which level first?". Platform side is **BOLD-1995** (memory-aware viewer/tenant interview engine, text + `gpt-live-1` voice).
6. **Voice** behind sign-in (gpt-live-1). Needs a non-video voice session kind (BOLD-1995), or a portal-side prototype with an OpenAI key (on hold).
7. **Ownership by viewer:** signed-in members own threads across devices (today: per browser).
8. **Share snapshots:** once profiles exist, live threads go owner-private and "Share your run" creates a public snapshot.
9. **Artifacts:** public/portal-rendered mode for BOLD-1980 viewer artifacts (branch `feat/bold-artifacts-v1`, which is private-only, has 7-day shares, generic OG, and strips citations). New kinds: strategy guide/plan, script, scorecard.
10. **Easter eggs:** Konami code → secret mode; 404 "Game over"; achievements; high-score/streak on share cards.
11. **SEO + Product Hunt kit:** sitemap, robots, JSON-LD (FAQPage for public runs, VideoObject for clips), gallery images, demo GIF, tagline, maker comment.
12. **bold-js release** with `viewer`/`viewerProfile` on chat; then delete the patch.

---

## 7. Gotchas learned (so the next session doesn't relearn them)

- Anything reading `headers()`/cookies in the root layout makes every page dynamic. Session reads stay client-side.
- The standalone `proxy.ts` used to fetch ~300KB of settings on every request (before the CDN), so keep the 60s cache. Main and the other forks still have the bug.
- Satori: text divs with interpolations need explicit `display: flex`; `inset` is ignored (use top/left/width/height); no webp/svg images (use PNG/JPEG).
- QR codes on the print sheet must stay short-URL + margin + ≥84px, or phones can't scan them.
- next/og PNGs are ~380KB; WhatsApp drops >300KB, so re-encode to JPEG (done in the route).
- Better Auth stateless = no `database` + `cookieCache { strategy: "jwe", refreshCache: true }`. The route is `app/api/auth/[...all]`.
- `bun patch` edits `node_modules` then `bun patch --commit`; both `dist/index.js` and `.cjs` (+ `.d.ts`/`.d.cts`).
- The dev server dies when you run `bun run build` in the same checkout; restart it.
- Playwright MCP screenshots may freeze CSS animations at frame 0; use `page.screenshot({ animations: 'allow' })` via run-code.
- `/videos/latest` caps at 50; use `videos.list({ page: 1 })` for the full library.
- Video tags are objects, not strings, and the SDK camelizes settings keys (see memory notes).
