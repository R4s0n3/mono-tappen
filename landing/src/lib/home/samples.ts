export type SamplePrompt = {
  text: string;
  /** Deal order printed on the stage card, same footer as play's LiveCard. */
  turn: number;
};

/**
 * Prompts from the official Tappen deck (`play/prisma/seed.js` CARDS).
 * The room deals these on the classic skin: light face, common frame.
 */
export const HOME_SAMPLES: readonly SamplePrompt[] = [
  {
    text: "Who here would you trust with your life?",
    turn: 1,
  },
  {
    text: "What's the worst thing you've done to get out of plans?",
    turn: 2,
  },
  {
    text: "Tell us about a secret you've never told this table.",
    turn: 3,
  },
  {
    text: "What's the most embarrassing thing you've ever done in public?",
    turn: 4,
  },
  {
    text: "Have you ever lied about your height?",
    turn: 5,
  },
  {
    text: "What's your guiltiest pleasure?",
    turn: 6,
  },
];
