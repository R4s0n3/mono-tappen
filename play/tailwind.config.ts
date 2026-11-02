import { type Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";
import plugin from 'tailwindcss/plugin';

export default {
  content: ["./src/**/*.tsx"],
  safelist:[
    {
      pattern: /^(frame_|font-|animate-|z-)/, // Matches all classes starting with "frame_" or "font-"
    },
  ],
  theme: {
    
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
        serif: ["var(--font-serif)", ...fontFamily.serif],
        cursive: ["var(--font-serif)", ...fontFamily.serif], // Uses Playfair italic
        bang: ["var(--font-lilita-one)", ...fontFamily.sans],
        calm: ["var(--font-cutez-calm)", ...fontFamily.sans],
      },
      colors: {
        'tappen-blue': {
          '50': '#f5f5fa',
          '100': '#eaeaef',
          '200': '#c5c6d6',
          '300': '#a0a2bd',
          '400': '#555a8b',
          '500': '#1d1f2f', // Primary Blue
          '600': '#1a1b2a',
          '700': '#151623',
          '800': '#10111c',
          '900': '#0d0e17',
        },
        'tappen-orange': {
          '50': '#fff8f2',
          '100': '#fff1e6',
          '200': '#ffddbf',
          '300': '#ffc999',
          '400': '#ff9f4d',
          '500': '#ff7512', // Primary Orange
          '600': '#e66810',
          '700': '#bf570d',
          '800': '#99460a',
          '900': '#7d3a08',
        },
        'tappen-sunset': {
          '50': '#fffaf2',
          '100': '#fff5e6',
          '200': '#ffe6bf',
          '300': '#ffd799',
          '400': '#ffb84d',
          '500': '#ff9912', // Primary Golden
          '600': '#e68a10',
          '700': '#bf730d',
          '800': '#995c0a',
          '900': '#7d4a08',
        },
        'tappen-purple': {
          '50': '#f6f2f9',
          '100': '#ece6f3',
          '200': '#d1bfe1',
          '300': '#b799cf',
          '400': '#8354a1',
          '500': '#501872', // Primary Purple
          '600': '#481567',
          '700': '#3b1156',
          '800': '#2e0d45',
          '900': '#250a38',
        },
        'tappen-green': {
          '50': '#f2f9f2',
          '100': '#e6f3e6',
          '200': '#bfe1bf',
          '300': '#99cf99',
          '400': '#4d9d4d',
          '500': '#137d13', // Primary Green
          '600': '#116c11',
          '700': '#0e5a0e',
          '800': '#0b470b',
          '900': '#093a09',
        },
      },
      animation: {
        shake: 'shake 0.82s cubic-bezier(.36,.07,.19,.97) both',
        liquid: 'background-move 60s ease infinite',
        "bg-move": 'liquid 12s ease-in-out infinite',
        wiggle: 'wiggle 3s ease-in-out infinite',
      },
      keyframes: {
    
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        'background-move': {
          '0%': { backgroundPosition: '0% 0%', backgroundSize:"300% 300%" },
          '25%': { backgroundPosition: '35% 80%', backgroundSize:"500% 500%" },
          '50%': { backgroundPosition: '95% 0%', backgroundSize:"400% 400%" },
          '75%': { backgroundPosition: '35% -80%', backgroundSize:"500% 500%" },
          '100%': { backgroundPosition: '0% 0%', backgroundSize:"300% 300%" },
        },
        shake: {
          '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(2px, 2px, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-4px, 2px, 0)' },
          '40%, 60%': { transform: 'translate3d(4px, 3px, 0)' },
        },
      },
    },
  },
  plugins: [
    // eslint-disable-next-line @typescript-eslint/unbound-method
    plugin(({ addUtilities }) => {
      addUtilities({
        '.skin-border': {
          position: 'relative',
          overflow: 'hidden',
        },
        '.frame_classic::before':{
          content: '""',
          position: 'absolute',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          zIndex: '1',
          maskImage: 'url(../../public/skins/borders/classic.svg)',
          maskSize: '100% 100%',
          pointerEvents: 'none',
          border: '15px transparent',
        },
        '.common::before': {
          background: "#1d1f2f",
          pointerEvents: 'none',
          zIndex: '1',
        },
        '.rare::before': {
          background: 'radial-gradient(#89CFF0, #4682B4, #1E3A8A)',
          pointerEvents: 'none',
          zIndex: '1',
        },
        '.epic::before': {
          background: '#501872',
          pointerEvents: 'none',
          zIndex: '1',
          animation:'glowBorder 3s infinite'
        },
        '.legendary::before': {
          backgroundSize: '280% 280%',
          background: 'radial-gradient( #c99700, #e6b800, #ffdd7d, #f0c27b )',
          zIndex: '1',
          animation:'liquidBorder 3s infinite'
        },
      });
    }),
  ],
} satisfies Config;