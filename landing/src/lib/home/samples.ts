export type SampleSkin = "classic" | "grove" | "night" | "gold";

export type SamplePrompt = {
  text: string;
  /** True when the print set marks this card as new (proposed=true). */
  proposed: boolean;
  skin: SampleSkin;
};

/**
 * A handful of prompts from the final print set (`text` column).
 * `proposed` cards are the new questions added for this box.
 */
export const HOME_SAMPLES: readonly SamplePrompt[] = [
  {
    text: "Do you miss someone at the moment?",
    proposed: false,
    skin: "classic",
  },
  {
    text: "If money was not a factor, how would you live your life?",
    proposed: false,
    skin: "grove",
  },
  {
    text: "What’s the most embarrassing thing that happened to you at school?",
    proposed: false,
    skin: "night",
  },
  {
    text: "Who at this table would survive the longest in a zombie apocalypse?",
    proposed: true,
    skin: "gold",
  },
  {
    text: "What’s something you pretend to understand but secretly don’t?",
    proposed: true,
    skin: "grove",
  },
  {
    text: "What’s a small moment that changed the direction of your life?",
    proposed: true,
    skin: "classic",
  },
];
