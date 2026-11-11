import { fontFamily } from "tailwindcss/defaultTheme";
import type { Config } from "tailwindcss";

import playConfig from "../tailwind.config";

const config: Config = {
  ...playConfig,
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../src/app/**/*.{ts,tsx}",
    "../src/styles/**/*.css",
  ],
  theme: {
    ...playConfig.theme,
    extend: {
      ...playConfig.theme.extend,
      fontFamily: {
        ...playConfig.theme.extend.fontFamily,
        "lilita-one": ["var(--font-lilita-one)", ...fontFamily.sans],
      },
    },
  },
};

export default config;
