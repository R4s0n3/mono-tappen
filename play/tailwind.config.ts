import { type Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";
import plugin from "tailwindcss/plugin";

import {
  skinUtilities,
  tappenAnimation,
  tappenColors,
  tappenFontFamily,
  tappenKeyframes,
  tappenSafelist,
} from "./tailwind.shared";

export default {
  content: ["./src/**/*.tsx"],
  safelist: tappenSafelist,
  theme: {
    extend: {
      fontFamily: tappenFontFamily(fontFamily),
      colors: tappenColors,
      animation: tappenAnimation,
      keyframes: tappenKeyframes,
    },
  },
  plugins: [
    // eslint-disable-next-line @typescript-eslint/unbound-method
    plugin(({ addUtilities }) => {
      addUtilities(skinUtilities);
    }),
  ],
} satisfies Config;
