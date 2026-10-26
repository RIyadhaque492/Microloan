/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './lib/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0f2a3f',
        navydark: '#0a1e2e',
        teal: {
          DEFAULT: '#14958f',
          50: '#e6f6f5',
          100: '#c8ebe8',
          600: '#128b85',
          700: '#0f7a75',
        },
        tealight: '#e6f6f5',
        gold: '#d99a2b',
      },
    },
  },
  plugins: [],
};
