/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        green: { DEFAULT: '#1a6b4a', light: '#e8f5ee', mid: '#2d8a5e' },
        gold:  { DEFAULT: '#c8a84b', light: '#fdf6e3' },
      },
      fontFamily: {
        sans:  ['DM Sans', 'sans-serif'],
        serif: ['DM Serif Display', 'serif'],
      },
    },
  },
  plugins: [],
}
