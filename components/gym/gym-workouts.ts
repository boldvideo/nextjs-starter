/**
 * World 1: the four starter levels, each a GTM skill with the one question
 * that plays it. Questions are phrased the way a founder would blurt them
 * out, and each is answerable from the FounderWell sessions.
 */
export interface GymWorkout {
  /** Level number, shown big ("World 1-1") */
  label: string;
  /** GTM topic, shown as the category */
  topic: string;
  question: string;
  tone: "pink" | "cyan" | "orange" | "yellow";
}

export const GYM_WORKOUTS: GymWorkout[] = [
  {
    label: "World 1-1",
    topic: "Positioning",
    question: "How do I know if my positioning is too vague?",
    tone: "pink",
  },
  {
    label: "World 1-2",
    topic: "Outbound",
    question: "What should my first cold email actually say?",
    tone: "cyan",
  },
  {
    label: "World 1-3",
    topic: "Demos",
    question: "How do I stop feature-dumping in sales demos?",
    tone: "orange",
  },
  {
    label: "World 1-4",
    topic: "Objections",
    question: "A prospect says 'send me some info.' What do I do?",
    tone: "yellow",
  },
];

/** Random level: everything the game master can play with you. */
export const GYM_RANDOM_REPS: string[] = [
  "Who is my ideal customer, really?",
  "Am I charging too little?",
  "How do I create urgency without being salesy?",
  "Should I keep doing founder-led sales or hire a rep?",
  "How do I turn LinkedIn posts into actual pipeline?",
  "What metrics tell me a GTM campaign is working?",
  "Why are my reps booking zero demos a week?",
  "How do I build my first outbound list?",
  "What's a front-end offer and why do I need one?",
  "How do I compete with AI-first competitors?",
  "How do I test positioning before I rebuild the website?",
  "What should a high-converting landing page say?",
];

/** What the input types at you while you think. */
export const GYM_PLACEHOLDERS: string[] = [
  "my cold emails get zero replies…",
  "we have 12 customers and no clue who the ICP is…",
  "demo went great, then they ghosted…",
  "investors say our positioning is mush…",
  "should I raise prices?…",
  "how do I get to my first $1M in pipeline…",
];
