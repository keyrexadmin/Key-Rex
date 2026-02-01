import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Professional orange palette - complements black and white
        orange: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316', // Primary orange
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        // Professional dark theme - pure black base for logo visibility
        dark: {
          DEFAULT: '#000000', // Pure black background
          50: '#0a0a0a',
          100: '#141414',
          200: '#1a1a1a',
          300: '#1f1f1f',
          400: '#262626',
          500: '#2a2a2a',
          600: '#333333',
          700: '#404040',
          800: '#4a4a4a',
          900: '#525252',
        },
        // Light/white palette for text and contrast
        light: {
          DEFAULT: '#ffffff',
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
        },
      },
    },
  },
  plugins: [],
}
export default config






