export type SamplePrompt = {
  text: string;
  author: string;
};

/**
 * First prompts returned by the original app
 * (`GET https://api.tappen.app/api/cards/published-cards`).
 * Strings are copied as stored, including the original spelling.
 */
export const HOME_SAMPLES: readonly SamplePrompt[] = [
  {
    text: "When was the last time you did something for the first time?",
    author: "Tappen",
  },
  {
    text: "Whatˋs your biggest kitchen fail?",
    author: "Tappen",
  },
  {
    text: "If there was a solution to your anxiety, how would it look like?",
    author: "Tappen",
  },
  {
    text: "What do you like about yourself?",
    author: "Tappen",
  },
  {
    text: "Do you miss someone at the moment?",
    author: "Tappen",
  },
  {
    text: "What is the most embarrassing thing happend to you in school?",
    author: "Tappen",
  },
];
