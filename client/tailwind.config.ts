import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#EF323F',
          dark: '#2D2D2D',
          hover: '#212121',
          pressed: '#161616',
        },
        neutral: {
          white: '#FFFFFF',
          soft: '#F7F7F7',
          almond: '#F3F0E8',
          ash: '#5D5B5B',
          silver: '#D3D3D3',
        },
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF323F',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '8px',
        input: '6px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
        modal: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [],
};

export default config;
