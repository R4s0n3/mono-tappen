import { fontFamily } from "tailwindcss/defaultTheme";
import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

import {
  skinUtilities,
  tappenAnimation,
  tappenColors,
  tappenFontFamily,
  tappenKeyframes,
  tappenSafelist,
} from "../tailwind.shared";

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../src/app/**/*.{ts,tsx}",
    "../src/styles/**/*.css",
  ],
  safelist: tappenSafelist,
  theme: {
    extend: {
      fontFamily: {
        ...tappenFontFamily(fontFamily),
        "lilita-one": ["var(--font-lilita-one)", ...fontFamily.sans],
      },
      colors: tappenColors,
      animation: tappenAnimation,
      keyframes: tappenKeyframes,
    },
  },
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities(skinUtilities);
    }),
  ],
};

export default config;
