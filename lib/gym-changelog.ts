/**
 * The GTM Game's changelog, newest first. The first entry is the current
 * version (shown in the footer). Keep entries terse: a date, a name, a few
 * lines. Bump the minor version per shipped batch, the patch for fixes.
 */

export interface Release {
  version: string;
  date: string;
  name: string;
  changes: string[];
}

export const CHANGELOG: Release[] = [
  {
    version: "0.7.0",
    date: "2026-10-03",
    name: "Less is more",
    changes: [
      "Fewer buttons, less copy, one main action per screen",
      "Home: Ask → Learn → Do the quest",
      "Follow-ups are a chat bar; shared games get a start bar",
      "Shared answers say who asked; share cards show the coach",
      "Clip page: scrolls, pinned chat, one clip at a time, closable clips",
      "Footer on every page, this changelog",
    ],
  },
  {
    version: "0.6.0",
    date: "2026-10-02",
    name: "Quest log",
    changes: [
      "Quest board: save quests, count reps, finish for XP",
      "Ranks unlock coach chat, the Objection Dodger, a gold card",
      "Coach chat: ask about the whole session, watch only the clips",
      "Check-in counts reps, not days",
    ],
  },
  {
    version: "0.5.0",
    date: "2026-10-02",
    name: "Do the thing",
    changes: [
      "Answers as named moves with the words to say",
      "Coach clips instead of whole sessions",
      "Playbook, share a line, 7-day check-in",
      "Roast my pitch",
      "Objection Dodger challenge links, controller code entry",
    ],
  },
  {
    version: "0.4.0",
    date: "2026-10-01",
    name: "Insert coin",
    changes: [
      "Moved to play.founderwell.com",
      "Objection Dodger 2: typing attack, bosses, daily run, leaderboard",
      "Insert coin, difficulty select, personalized answers",
      "Share cards readable at timeline size",
    ],
  },
  {
    version: "0.3.0",
    date: "2026-09-30",
    name: "Press start",
    changes: [
      "GTM Gym becomes The GTM Game",
      "The Game Master robot, a note from Vanessa",
    ],
  },
  {
    version: "0.2.0",
    date: "2026-09-29",
    name: "Training plans",
    changes: [
      "Answers as training plans, coaches on every clip",
      "Google sign-in, player card",
      "Only the asker can continue a game",
    ],
  },
  {
    version: "0.1.0",
    date: "2026-09-28",
    name: "Gym",
    changes: ["FounderWell's coaching sessions, one question away, on Bold"],
  },
];

export const GAME_VERSION = CHANGELOG[0].version;
