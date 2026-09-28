/**
 * The gym's program: each workout is a GTM muscle group with the one
 * question that trains it. Questions are phrased the way a founder would
 * blurt them out, and each is answerable from the FounderWell tape.
 */
export interface GymWorkout {
  /** Gym framing, shown big */
  label: string;
  /** GTM topic, shown as the category */
  topic: string;
  /** One-line trash talk */
  bark: string;
  question: string;
  tone: "pink" | "cyan" | "orange" | "yellow";
}

export const GYM_WORKOUTS: GymWorkout[] = [
  {
    label: "Leg day",
    topic: "Positioning",
    bark: "Nobody wants to do it. Everybody needs it.",
    question: "How do I know if my positioning is too vague?",
    tone: "pink",
  },
  {
    label: "Cardio",
    topic: "Outbound",
    bark: "Volume without becoming spam.",
    question: "What should my first cold email actually say?",
    tone: "cyan",
  },
  {
    label: "Heavy lift",
    topic: "Demos",
    bark: "Stop feature-dumping on people.",
    question: "How do I stop feature-dumping in sales demos?",
    tone: "orange",
  },
  {
    label: "Sparring",
    topic: "Objections",
    bark: "They said “send me some info.”",
    question: "A prospect says 'send me some info.' What do I do?",
    tone: "yellow",
  },
];

/** The dice roll: everything the gym can spot you on. */
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
