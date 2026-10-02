# Concepts

> Shared domain vocabulary for this project — entities, named processes, and status concepts with project-specific meaning. Seeded with core domain vocabulary, then accretes as ce-compound and ce-compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or catch-all.

## Library and playback

### Session
One recorded coaching video in a tenant's library: a workshop, call, or seminar, usually long. The unit a tenant licenses and may sell in full elsewhere.
*Avoid:* video, recording (when the coaching unit is meant)

### Citation
A specific moment in a Session that an AI answer points to as evidence for a claim: which Session, and where in it the cited statement starts and ends. A Citation is evidence, not playback; how much of the Session a viewer gets to watch is decided separately, by the Clip.
*Avoid:* source, receipt (UI copy may say "receipt", but the concept is the Citation)

### Clip
The bounded part of a Session that plays for a Citation: the whole thought around the cited statement, chosen by the server from the transcript rather than by the AI, and long enough to land the point but far shorter than the Session.

Whether a Session plays as Clips or in full is meant to follow the caller's policy, not the Session: the same Session can play in full in a tenant's members area and only as Clips in a public game or an AI-assistant surface (per-caller enforcement is planned, not yet in place). A Clip is only a protection boundary when playback is signed with the window inside the token; on publicly playable media it is a viewing experience, not access control.
*Avoid:* snippet, teaser (as nouns for the bounded playback)

### Coach
A person who teaches in a tenant's Sessions and is credited for the advice drawn from them. A Session without a known Coach is credited as a guest session rather than to whichever Coach leads the answer.

## Answers

### Level
One question and its answer inside a game; a game is a sequence of Levels, and each follow-up question starts the next one. Later Levels must build on what earlier Levels promised, never contradict it.

### Move
One named step in an answer: a short command as its name, what to do, the Citation that teaches it, and, for how-to questions, the exact words to say or write. The portal renders each Move as its own card, so the answer's shape is a contract between the prompt and the portal.

### Detour
The answer shape for a question the library can't really answer: one honest line, at most one cited closest lesson, and three go-to-market questions to play instead. It replaces stretched Moves and a fake next step. The portal recognizes it by its shape; a marker the model may add is only an optional hint. Whether the honest line carries a citation distinguishes an off-topic Detour from one the library only barely covers.
*Avoid:* off-the-map, thin (as names for the shape; they survive only as that cited-or-not distinction)

### Mode
A caller-prescribed output format sent through the same answer prompt, such as the Objection Dodger's or Roast my pitch's line-based formats. A Mode is meant to win over the normal answer shape (as of this writing the prompt only guarantees that for questions not classified factual), so any prompt change must leave every Mode working.

## Progress

### Quest
The next step an answer closes with, as something the player does outside the game. A Quest can be saved to the player's quest board and tracked toward its count ("talk to 5 founders" → 0/5); finishing one pays XP once.

### Rank
The player's standing, earned with XP; each Rank unlocks something in the game (coach chat, the Objection Dodger, …). Not a Level: a Level is one question and its answer.
*Avoid:* level (for player progression)
