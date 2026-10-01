// tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // <-- Esta línea es la más importante
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#fff3eb',
          100: '#ffe5d1',
          200: '#ffcaa4',
          300: '#ffa66d',
          400: '#ff7733',
          500: '#ff5105',
          600: '#f03e00',
          700: '#c82e00',
          800: '#9f2405',
          900: '#802008',
        }
      }
    },
  },
  plugins: [],
}