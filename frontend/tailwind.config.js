/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: {
          900: '#0b0f19',
          800: '#111827',
          700: '#1f2937',
          accent: '#8b5cf6',
          cyan: '#06b6d4',
          emerald: '#10b981'
        }
      }
    },
  },
  plugins: [],
}
