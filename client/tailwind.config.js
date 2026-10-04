/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        warm: {
          50: '#fdfbf7',
          100: '#f7f3eb',
          200: '#eee5d5',
          300: '#dfd0b7',
          400: '#cbb393',
          500: '#b89874',
          600: '#a38161',
          700: '#876950',
          800: '#6f5644',
          900: '#5c473a',
        }
      }
    },
  },
  plugins: [],
}
